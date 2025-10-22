"use client";

import { useState } from "react";
import { X, CheckCircle, XCircle, FileText, User, Calendar, MessageSquare } from "lucide-react";

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: "approve" | "reject", comments: string) => void;
  document: {
    id: string;
    title: string;
    type: string;
    author: string;
    department: string;
    submittedDate: string;
    currentStep: string;
    description?: string;
  };
  isLoading?: boolean;
}

export default function ApprovalDialog({
  isOpen,
  onClose,
  onSubmit,
  document,
  isLoading = false
}: ApprovalDialogProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [showComments, setShowComments] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (action) {
      onSubmit(action, comments);
      // Reset form
      setAction(null);
      setComments("");
      setShowComments(false);
    }
  };

  const handleClose = () => {
    setAction(null);
    setComments("");
    setShowComments(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Dialog */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Review Document
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Document Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    {document.title}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="font-medium">Type:</span>
                      <span className="ml-2">{document.type}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>{document.author}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">Department:</span>
                      <span className="ml-2">{document.department}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Submitted: {new Date(document.submittedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {document.description && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Description:</p>
                          <p className="text-sm text-gray-600">{document.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Step */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm">
                <span className="font-medium text-blue-900">Current Step:</span>
                <span className="ml-2 text-blue-700">{document.currentStep}</span>
              </p>
            </div>

            {/* Action Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Your Decision:</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setAction("approve");
                    setShowComments(true);
                  }}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    action === "approve"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-25"
                  }`}
                >
                  <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${
                    action === "approve" ? "text-green-600" : "text-gray-400"
                  }`} />
                  <p className={`font-medium ${
                    action === "approve" ? "text-green-700" : "text-gray-700"
                  }`}>
                    Approve
                  </p>
                </button>
                
                <button
                  onClick={() => {
                    setAction("reject");
                    setShowComments(true);
                  }}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    action === "reject"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-red-300 hover:bg-red-25"
                  }`}
                >
                  <XCircle className={`h-6 w-6 mx-auto mb-2 ${
                    action === "reject" ? "text-red-600" : "text-gray-400"
                  }`} />
                  <p className={`font-medium ${
                    action === "reject" ? "text-red-700" : "text-gray-700"
                  }`}>
                    Reject
                  </p>
                </button>
              </div>
            </div>

            {/* Comments */}
            {showComments && (
              <div className="mb-6">
                <label 
                  htmlFor="approval-comments" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Comments {action === "reject" && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="approval-comments"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    action === "approve" 
                      ? "Optional comments for approval..."
                      : "Please explain why this document is being rejected..."
                  }
                  required={action === "reject"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {action === "reject" && (
                  <p className="mt-1 text-xs text-red-600">
                    Comments are required when rejecting a document.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSubmit}
              disabled={!action || isLoading || (action === "reject" && !comments.trim())}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                action === "approve"
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : action === "reject"
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  : "bg-gray-400"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {action === "approve" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {action === "reject" && <XCircle className="h-4 w-4 mr-2" />}
                  {action === "approve" ? "Approve Document" : action === "reject" ? "Reject Document" : "Select Action"}
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
