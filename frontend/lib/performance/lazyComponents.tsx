"use client";

import React, { Suspense, lazy, ComponentType } from "react";
import { LoadingWrapper } from "@/components/ui/LoadingWrapper";

// Lazy load heavy components
const AnalyticsPage = lazy(() => import("@/app/analytics/page"));
const MemoStatusChart = lazy(() => import("@/components/charts/ChartComponents").then(module => ({ default: module.MemoStatusChart })));
const DocumentTrendChart = lazy(() => import("@/components/charts/ChartComponents").then(module => ({ default: module.DocumentTrendChart })));
const DepartmentActivityChart = lazy(() => import("@/components/charts/ChartComponents").then(module => ({ default: module.DepartmentActivityChart })));
const WorkflowCompletionChart = lazy(() => import("@/components/charts/ChartComponents").then(module => ({ default: module.WorkflowCompletionChart })));
const UserActivityRadar = lazy(() => import("@/components/charts/ChartComponents").then(module => ({ default: module.UserActivityRadar })));

// Higher-order component for lazy loading with loading fallback
function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  LoadingComponent?: React.ComponentType,
  fallback?: React.ReactNode
) {
  const LazyComponent = (props: T) => (
    <Suspense
      fallback={
        fallback ||
        (LoadingComponent ? <LoadingComponent /> : (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ))
      }
    >
      <Component {...props} />
    </Suspense>
  );

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name || 'Component'})`;
  return LazyComponent;
}

// Lazy loaded components with loading states
export const LazyAnalyticsPage = withLazyLoading(AnalyticsPage, undefined, (
  <LoadingWrapper isLoading={true} skeleton="dashboard" />
));

export const LazyMemoStatusChart = withLazyLoading(MemoStatusChart);
export const LazyDocumentTrendChart = withLazyLoading(DocumentTrendChart);
export const LazyDepartmentActivityChart = withLazyLoading(DepartmentActivityChart);
export const LazyWorkflowCompletionChart = withLazyLoading(WorkflowCompletionChart);
export const LazyUserActivityRadar = withLazyLoading(UserActivityRadar);

// Dynamic imports for conditional loading
export const loadChartComponent = (chartType: string) => {
  switch (chartType) {
    case "memo-status":
      return import("@/components/charts/ChartComponents").then(module => ({ default: module.MemoStatusChart }));
    case "document-trend":
      return import("@/components/charts/ChartComponents").then(module => ({ default: module.DocumentTrendChart }));
    case "department-activity":
      return import("@/components/charts/ChartComponents").then(module => ({ default: module.DepartmentActivityChart }));
    case "workflow-completion":
      return import("@/components/charts/ChartComponents").then(module => ({ default: module.WorkflowCompletionChart }));
    case "user-activity":
      return import("@/components/charts/ChartComponents").then(module => ({ default: module.UserActivityRadar }));
    default:
      return Promise.reject(new Error(`Unknown chart type: ${chartType}`));
  }
};

// Intersection Observer for lazy loading when elements come into view
export const useLazyLoadOnVisible = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};
