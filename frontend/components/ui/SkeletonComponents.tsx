"use client";

import React from "react";
import Skeleton from "./Skeleton";

// Card Skeleton for dashboard cards
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton variant="circular" className="h-8 w-8" />
    </div>
    <Skeleton className="h-8 w-16 mb-2" />
    <Skeleton className="h-3 w-24" />
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <div className="p-6 border-b border-gray-200">
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-20" />
      ))}
    </div>
  </div>
);

// Memo Card Skeleton
export const MemoCardSkeleton: React.FC = () => (
  <div className="p-6 hover:bg-gray-50 border-b border-gray-200">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <Skeleton variant="circular" className="h-4 w-4" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-start space-x-4">
          <Skeleton variant="circular" className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
    <div className="flex justify-end space-x-3">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Content Areas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton variant="circular" className="h-8 w-8" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Page Loading Skeleton
export const PageLoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Top Bar Placeholder */}
    <div className="h-16 bg-white border-b border-gray-200"></div>

    {/* Sidebar Placeholder */}
    <div className="fixed top-16 left-0 w-64 h-full bg-white border-r border-gray-200 p-6 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>

    {/* Main Content */}
    <div className="lg:pl-64 pt-16">
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    </div>
  </div>
);

export default {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  MemoCardSkeleton,
  SearchResultsSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  PageLoadingSkeleton
};

