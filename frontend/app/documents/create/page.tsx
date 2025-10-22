"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  Check,
  Calendar,
  User,
  Building,
  Tag,
  Save,
  Download,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Eye,
  EyeOff,
  Undo,
  Redo
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES, NPA_PORTS } from "@/lib/npa-structure";

export default function CreateDocumentPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [documentData, setDocumentData] = useState({
    title: "",
    type: "",
    department: "",
    port: "",
    accessLevel: "internal"
  });
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Document templates
  const templates = [
    {
      id: "memo",
      name: "Official Memo",
      description: "Standard memo format for official communications",
      content: `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 18px; font-weight: bold; margin: 0;">NIGERIAN PORTS AUTHORITY</h1>
          <p style="margin: 5px 0; font-size: 14px;">[PORT NAME]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p><strong>TO:</strong> [Recipient Name and Title]</p>
          <p><strong>FROM:</strong> [Your Name and Title]</p>
          <p><strong>DATE:</strong> [Current Date]</p>
          <p><strong>SUBJECT:</strong> [Memo Subject]</p>
        </div>

        <div style="margin-top: 20px;">
          <p>Dear [Recipient],</p>
          <p>[Your memo content goes here...]</p>
          <p>Please find attached [any attachments] for your review and necessary action.</p>
          <p>Thank you for your attention to this matter.</p>
          <p>Sincerely,</p>
          <p>[Your Name]<br>[Your Title]<br>[Your Department]</p>
        </div>
      `
    },
    {
      id: "report",
      name: "Financial Report",
      description: "Template for financial reports and budget documents",
      content: `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0;">FINANCIAL REPORT</h1>
          <p style="margin: 5px 0; font-size: 14px;">[Department Name] - [Port Name]</p>
          <p style="margin: 5px 0; font-size: 12px;">Period: [Date Range]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Executive Summary</h2>
          <p>[Brief summary of financial performance...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Revenue Analysis</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Category</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount (₦)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">% of Total</th>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Port Operations</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">[Amount]</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">[Percentage]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Services</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">[Amount]</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">[Percentage]</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Expenditure Analysis</h2>
          <p>[Analysis of expenses and cost breakdown...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Recommendations</h2>
          <ul>
            <li>[Recommendation 1]</li>
            <li>[Recommendation 2]</li>
            <li>[Recommendation 3]</li>
          </ul>
        </div>
      `
    },
    {
      id: "incident",
      name: "Incident Report",
      description: "Template for security and operational incident reports",
      content: `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 18px; font-weight: bold; margin: 0;">INCIDENT REPORT</h1>
          <p style="margin: 5px 0; font-size: 14px;">[Port Name] - [Department]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; width: 30%;">Report Number:</td>
              <td style="border: 1px solid #ddd; padding: 8px;">[Auto-generated]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Date of Incident:</td>
              <td style="border: 1px solid #ddd; padding: 8px;">[Date]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Time of Incident:</td>
              <td style="border: 1px solid #ddd; padding: 8px;">[Time]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Location:</td>
              <td style="border: 1px solid #ddd; padding: 8px;">[Location]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Reporter:</td>
              <td style="border: 1px solid #ddd; padding: 8px;">[Your Name and Title]</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Incident Description</h2>
          <p>[Detailed description of what happened...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Immediate Actions Taken</h2>
          <ul>
            <li>[Action 1]</li>
            <li>[Action 2]</li>
            <li>[Action 3]</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Witnesses</h2>
          <p>Name: [Witness Name] - Contact: [Phone/Email]</p>
          <p>Name: [Witness Name] - Contact: [Phone/Email]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>Recommendations</h2>
          <p>[Recommendations to prevent similar incidents...]</p>
        </div>
      `
    },
    {
      id: "policy",
      name: "Policy Document",
      description: "Template for creating policy documents and procedures",
      content: `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0;">[POLICY TITLE]</h1>
          <p style="margin: 5px 0; font-size: 14px;">Nigerian Ports Authority</p>
          <p style="margin: 5px 0; font-size: 12px;">Effective Date: [Date] | Version: 1.0</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>1. Purpose</h2>
          <p>[Purpose and scope of this policy...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>2. Scope</h2>
          <p>[Who this policy applies to and what it covers...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>3. Policy Statement</h2>
          <p>[The actual policy content...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>4. Procedures</h2>
          <ol>
            <li>[Step 1]</li>
            <li>[Step 2]</li>
            <li>[Step 3]</li>
          </ol>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>5. Responsibilities</h2>
          <p><strong>Department Heads:</strong> [Responsibilities...]</p>
          <p><strong>Employees:</strong> [Responsibilities...]</p>
          <p><strong>HR Department:</strong> [Responsibilities...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>6. Compliance</h2>
          <p>[Compliance requirements and monitoring...]</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2>7. Review and Updates</h2>
          <p>[How often this policy will be reviewed and updated...]</p>
        </div>
      `
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDocumentData(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertTable = () => {
    const table = `
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Column 1</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Column 2</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Column 3</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 1, Cell 1</td>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 1, Cell 2</td>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 1, Cell 3</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 2, Cell 1</td>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 2, Cell 2</td>
          <td style="border: 1px solid #ddd; padding: 8px;">Row 2, Cell 3</td>
        </tr>
      </table>
    `;
    applyFormat('insertHTML', table);
  };

  const loadTemplate = (template: any) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
      setContent(template.content);
      setShowTemplates(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Document saved successfully!');
  };

  const handleExport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${documentData.title || 'Document'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1, h2, h3 { color: #333; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Create Document</h1>
              <p className="text-sm text-gray-600">Create and edit documents online</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Properties Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Properties</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={documentData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  name="type"
                  value={documentData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select document type</option>
                  {NPA_DOCUMENT_TYPES.map((type) => (
                    <option key={type.code} value={type.code.toLowerCase()}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  name="department"
                  value={documentData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select department</option>
                  {NPA_DEPARTMENTS
                    .filter(dept => dept.parent === null)
                    .map((dept) => (
                      <option key={dept.code} value={dept.code.toLowerCase()}>
                        {dept.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port/Location *
                </label>
                <select
                  name="port"
                  value={documentData.port}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select port/location</option>
                  {NPA_PORTS.map((port) => (
                    <option key={port.code} value={port.code.toLowerCase()}>
                      {port.name} ({port.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Level
                </label>
                <select
                  name="accessLevel"
                  value={documentData.accessLevel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-2 flex-wrap">
                <button
                  onClick={() => applyFormat('bold')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('italic')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('underline')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={() => applyFormat('justifyLeft')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('justifyCenter')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('justifyRight')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={() => applyFormat('insertUnorderedList')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('insertOrderedList')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={insertTable}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Insert Table"
                >
                  <Table className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={() => applyFormat('undo')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Undo"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFormat('redo')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Redo"
                >
                  <Redo className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                <button
                  onClick={() => setIsPreview(!isPreview)}
                  className={`p-2 rounded ${isPreview ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                  title={isPreview ? 'Edit Mode' : 'Preview Mode'}
                >
                  {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="p-6">
              {isPreview ? (
                <div
                  className="bg-white border border-gray-300 rounded-lg p-8 min-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleContentChange}
                  className="bg-white border border-gray-300 rounded-lg p-8 min-h-[600px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: '600px' }}
                  data-placeholder="Start typing your document..."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Document Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Use Template →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}