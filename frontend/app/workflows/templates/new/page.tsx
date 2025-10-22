"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowRight, Save } from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES, NPA_ROLES } from "@/lib/npa-structure";

export default function NewWorkflowTemplatePage() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [steps, setSteps] = useState([
    { id: 1, name: "", approver: "", department: "", order: 1 }
  ]);

  const addStep = () => {
    const newStep = {
      id: steps.length + 1,
      name: "",
      approver: "",
      department: "",
      order: steps.length + 1
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: number) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const updateStep = (id: number, field: string, value: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock save - in real app, this would call the API
    console.log("Creating workflow template:", { templateName, description, documentType, steps });
    alert("Workflow template created successfully!");
    router.push("/workflows");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Workflow Template</h1>
          <p className="text-gray-600">Define a reusable workflow template with multiple approval steps</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Budget Approval Workflow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select document type</option>
                {NPA_DOCUMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code.toLowerCase()}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the purpose of this workflow template..."
              />
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Approval Steps</h2>
            <button
              type="button"
              onClick={addStep}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Step Name *
                    </label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Manager Review"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approver Role *
                    </label>
                    <select
                      value={step.approver}
                      onChange={(e) => updateStep(step.id, 'approver', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select role</option>
                      {NPA_ROLES.map((role) => (
                        <option key={role.code} value={role.code.toLowerCase()}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={step.department}
                      onChange={(e) => updateStep(step.id, 'department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Any Department</option>
                      {NPA_DEPARTMENTS
                        .filter(dept => dept.parent === null)
                        .map((dept) => (
                          <option key={dept.code} value={dept.code.toLowerCase()}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {index < steps.length - 1 && (
                  <div className="absolute left-10 mt-16">
                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                )}
              </div>
            ))}
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
            <Save className="w-4 h-4 mr-2" />
            Create Template
          </button>
        </div>
      </form>
    </div>
  );
}
