"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Send, X } from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES } from "@/lib/npa-structure";

export default function StartWorkflowPage() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Sample documents with real NPA document types
  const documents = [
    { id: "1", title: "Q4 2024 Budget Proposal.pdf", type: "Financial Report", department: "Finance" },
    { id: "2", title: "HR Policy Guidelines 2025.docx", type: "Policy Document", department: "Human Resources" },
    { id: "3", title: "Port Security Guidelines.pdf", type: "Operational Document", department: "Security" },
    { id: "4", title: "Vendor Contract - ABC Corp.pdf", type: "Contract", department: "Procurement" },
    { id: "5", title: "ICT Infrastructure Report.pdf", type: "Technical Document", department: "Information & Communication Technology" },
    { id: "6", title: "Marine Operations Manual.pdf", type: "Operational Document", department: "Marine & Operations" },
  ];

  // Sample workflow templates with real NPA structure
  const templates = [
    { id: "1", name: "Financial Approval Workflow", steps: 4, type: "Financial Report", departments: ["Finance", "Audit"] },
    { id: "2", name: "Policy Review Workflow", steps: 5, type: "Policy Document", departments: ["Legal Services", "Human Resources"] },
    { id: "3", name: "Contract Approval Workflow", steps: 6, type: "Contract", departments: ["Procurement", "Legal Services", "Finance"] },
    { id: "4", name: "Technical Document Review", steps: 3, type: "Technical Document", departments: ["Information & Communication Technology"] },
    { id: "5", name: "Marine Operations Workflow", steps: 4, type: "Operational Document", departments: ["Marine & Operations", "Security"] },
    { id: "6", name: "Board Paper Workflow", steps: 7, type: "Board Paper", departments: ["Corporate & Strategic Planning", "Legal Services"] },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission - in real app, this would call the API
    console.log("Starting workflow:", {
      selectedDocument,
      selectedTemplate,
      priority,
      dueDate,
      notes,
      attachments
    });
    alert("Workflow started successfully!");
    router.push("/workflows");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Start New Workflow</h1>
          <p className="text-gray-600">Initiate a new approval workflow for a document</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Document</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document *
            </label>
            <select
              value={selectedDocument}
              onChange={(e) => setSelectedDocument(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.type})
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Select an existing document or upload a new one below
            </p>
          </div>
        </div>

        {/* Workflow Template */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Template</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template *
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a workflow template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.steps} steps) - {template.type}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Selected Template Details:</p>
                <p className="text-sm text-blue-700 mt-1">
                  {templates.find(t => t.id === selectedTemplate)?.steps} approval steps required
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Comments
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes or instructions for the approvers..."
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments (Optional)</h2>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB each
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push("/workflows")}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            Start Workflow
          </button>
        </div>
      </form>
    </div>
  );
}
