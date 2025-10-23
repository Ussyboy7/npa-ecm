"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  RadialLinearScale,
} from "chart.js";
import {
  Line,
  Bar,
  Doughnut,
  Pie,
  Radar,
} from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  RadialLinearScale
);

// Common chart options
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}

interface ChartOptions {
  responsive?: boolean;
  plugins?: {
    legend?: {
      position?: 'top' | 'left' | 'right' | 'bottom';
      display?: boolean;
    };
    title?: {
      display?: boolean;
      text?: string;
    };
  };
  scales?: {
    y?: {
      beginAtZero?: boolean;
    };
  };
}

interface BaseChartProps {
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}

// Line Chart Component
export const LineChart: React.FC<BaseChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ""
}) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Line data={data} options={chartOptions} />
    </div>
  );
};

// Bar Chart Component
export const BarChart: React.FC<BaseChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ""
}) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Bar data={data} options={chartOptions} />
    </div>
  );
};

// Doughnut Chart Component
export const DoughnutChart: React.FC<BaseChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ""
}) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Doughnut data={data} options={chartOptions} />
    </div>
  );
};

// Pie Chart Component
export const PieChart: React.FC<BaseChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ""
}) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Pie data={data} options={chartOptions} />
    </div>
  );
};

// Radar Chart Component
export const RadarChart: React.FC<BaseChartProps> = ({
  data,
  options = {},
  height = 300,
  className = ""
}) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Radar data={data} options={chartOptions} />
    </div>
  );
};

// Pre-built Charts for ECM Dashboard

// Memo Status Distribution
export const MemoStatusChart: React.FC<{ data: number[] }> = ({ data }) => {
  const chartData = {
    labels: ["Draft", "Pending", "In Review", "Approved", "Rejected"],
    datasets: [
      {
        label: "Memos",
        data: data,
        backgroundColor: [
          "rgba(156, 163, 175, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgb(156, 163, 175)",
          "rgb(245, 158, 11)",
          "rgb(59, 130, 246)",
          "rgb(34, 197, 94)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return <DoughnutChart data={chartData} height={250} />;
};

// Document Upload Trends
export const DocumentTrendChart: React.FC<{ data: { labels: string[]; values: number[] } }> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Documents Uploaded",
        data: data.values,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  };

  return <LineChart data={chartData} options={options} height={250} />;
};

// Department Activity
export const DepartmentActivityChart: React.FC<{ data: { labels: string[]; values: number[] } }> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Documents",
        data: data.values,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  };

  return <BarChart data={chartData} options={options} height={250} />;
};

// Workflow Completion Rate
export const WorkflowCompletionChart: React.FC<{ data: { labels: string[]; completed: number[]; pending: number[] } }> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Completed",
        data: data.completed,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
      {
        label: "Pending",
        data: data.pending,
        backgroundColor: "rgba(245, 158, 11, 0.8)",
      },
    ],
  };

  const options = {
    scales: {
      x: {
        stacked: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
      },
    },
  };

  return <BarChart data={chartData} options={options} height={250} />;
};

// User Activity Radar
export const UserActivityRadar: React.FC<{ data: { labels: string[]; values: number[] } }> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Activity Score",
        data: data.values,
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 2,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgb(59, 130, 246)",
      },
    ],
  };

  const options = {
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        angleLines: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        pointLabels: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  return <RadarChart data={chartData} options={options} height={300} />;
};

const ChartComponents = {
  LineChart,
  BarChart,
  DoughnutChart,
  PieChart,
  RadarChart,
  MemoStatusChart,
  DocumentTrendChart,
  DepartmentActivityChart,
  WorkflowCompletionChart,
  UserActivityRadar,
};

export default ChartComponents;

