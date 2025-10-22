"use client";

import React from "react";
import { DashboardSkeleton, FormSkeleton, SearchResultsSkeleton, MemoCardSkeleton } from "./SkeletonComponents";

interface LoadingWrapperProps {
  isLoading: boolean;
  skeleton?: "dashboard" | "form" | "search" | "memos" | "table";
  children: React.ReactNode;
  className?: string;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  skeleton = "dashboard",
  children,
  className = ""
}) => {
  if (isLoading) {
    const SkeletonComponent = {
      dashboard: DashboardSkeleton,
      form: FormSkeleton,
      search: SearchResultsSkeleton,
      memos: () => (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
          </div>
          <div className="divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <MemoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ),
      table: () => (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }[skeleton];

    return (
      <div className={className}>
        <SkeletonComponent />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

export default LoadingWrapper;

