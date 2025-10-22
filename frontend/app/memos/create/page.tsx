"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useNotificationActions } from "@/components/notifications/notificationUtils";

export default function CreateMemoPage() {
  const { showSuccess, showError } = useNotificationActions();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("Submitting memo");
      showSuccess(
        "Memo Submitted Successfully",
        "Your memo has been submitted and is pending approval.",
        {
          label: "View Status",
          onClick: () => {
            // Navigate to memos page or show status
            window.location.href = "/memos";
          }
        }
      );
    } catch (error) {
      showError(
        "Submission Failed",
        "There was an error submitting your memo. Please try again."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Memo</h1>
          <p className="text-gray-600">Create and submit an internal memorandum</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/memos"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Memo Details</h2>
        </div>

        <div className="p-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memo Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter memo title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memo Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select type</option>
                  <option value="official">Official Memo</option>
                  <option value="internal">Internal Memo</option>
                </select>
              </div>
            </div>

            {/* Recipients */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To (Recipient) *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter recipient name or position"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CC (Carbon Copy)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional recipients (optional)"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memo Content *
              </label>
              <textarea
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the full memo content..."
                required
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Submit Memo
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="w-5 h-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Memo Guidelines</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Use clear, concise language</li>
                <li>Include specific details and deadlines</li>
                <li>Attach supporting documents when necessary</li>
                <li>Ensure correct recipient information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
