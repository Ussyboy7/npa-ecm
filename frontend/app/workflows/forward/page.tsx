"use client";

import { useState } from "react";
import Link from "next/link";

function ForwardReviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Workflow Forward</h1>
            <p className="text-gray-600 mb-6">This functionality is currently under development.</p>
            <Link
              href="/workflows"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Workflows
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForwardReviewPage;
