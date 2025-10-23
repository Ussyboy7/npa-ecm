"use client";

import {
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  Calculator,
  Receipt,
  Target,
  AlertTriangle,
  Activity,
  Percent
} from "lucide-react";
import Link from "next/link";

export default function FinanceDivisionDashboard() {
  const stats = [
    {
      name: "Total Revenue",
      value: "₦45.2B",
      change: "+12.5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Year to date",
      href: "/finance/revenue"
    },
    {
      name: "Operating Expenses",
      value: "₦28.7B",
      change: "+5.2%",
      changeType: "warning",
      icon: Receipt,
      description: "Current fiscal year",
      href: "/finance/expenses"
    },
    {
      name: "Net Profit Margin",
      value: "36.4%",
      change: "+2.1%",
      changeType: "positive",
      icon: Percent,
      description: "Profitability ratio",
      href: "/finance/profitability"
    },
    {
      name: "Budget Utilization",
      value: "87%",
      change: "+3%",
      changeType: "positive",
      icon: Target,
      description: "Annual budget progress",
      href: "/finance/budget"
    }
  ];

  const financialMetrics = [
    {
      metric: "Revenue Growth",
      value: "12.5%",
      trend: "up",
      target: "10%",
      status: "Above Target",
      period: "YTD vs Previous Year"
    },
    {
      metric: "Cost Efficiency",
      value: "₦0.63",
      trend: "down",
      target: "₦0.65",
      status: "Below Target",
      period: "Cost per Naira of Revenue"
    },
    {
      metric: "Cash Flow",
      value: "₦8.2B",
      trend: "up",
      target: "₦7.5B",
      status: "Above Target",
      period: "Operating Cash Flow"
    },
    {
      metric: "Debt-to-Equity",
      value: "0.35",
      trend: "down",
      target: "0.40",
      status: "Below Target",
      period: "Financial Leverage Ratio"
    }
  ];

  const revenueBreakdown = [
    {
      source: "Port Operations",
      amount: "₦28.5B",
      percentage: "63.1%",
      growth: "+15.2%",
      trend: "up",
      color: "bg-blue-500"
    },
    {
      source: "Cargo Handling",
      amount: "₦12.3B",
      percentage: "27.2%",
      growth: "+8.7%",
      trend: "up",
      color: "bg-green-500"
    },
    {
      source: "Pilotage Services",
      amount: "₦3.2B",
      percentage: "7.1%",
      growth: "+12.1%",
      trend: "up",
      color: "bg-yellow-500"
    },
    {
      source: "Other Services",
      amount: "₦1.2B",
      percentage: "2.6%",
      growth: "-2.3%",
      trend: "down",
      color: "bg-red-500"
    }
  ];

  const expenseAnalysis = [
    {
      category: "Personnel Costs",
      amount: "₦15.2B",
      percentage: "53.0%",
      budget: "₦16.0B",
      variance: "-5.0%",
      status: "Under Budget"
    },
    {
      category: "Operations & Maintenance",
      amount: "₦8.5B",
      percentage: "29.6%",
      budget: "₦8.0B",
      variance: "+6.3%",
      status: "Over Budget"
    },
    {
      category: "Infrastructure",
      amount: "₦3.8B",
      percentage: "13.2%",
      budget: "₦4.0B",
      variance: "-5.0%",
      status: "Under Budget"
    },
    {
      category: "Administrative",
      amount: "₦1.2B",
      percentage: "4.2%",
      budget: "₦1.5B",
      variance: "-20.0%",
      status: "Under Budget"
    }
  ];

  const budgetPerformance = [
    {
      department: "Marine Operations",
      allocated: "₦12.5B",
      spent: "₦10.8B",
      remaining: "₦1.7B",
      utilization: "86%",
      status: "On Track"
    },
    {
      department: "ICT Division",
      allocated: "₦8.2B",
      spent: "₦7.1B",
      remaining: "₦1.1B",
      utilization: "87%",
      status: "On Track"
    },
    {
      department: "Finance Division",
      allocated: "₦3.5B",
      spent: "₦3.2B",
      remaining: "₦0.3B",
      utilization: "91%",
      status: "On Track"
    },
    {
      department: "Human Resources",
      allocated: "₦4.8B",
      spent: "₦4.9B",
      remaining: "-₦0.1B",
      utilization: "102%",
      status: "Over Budget"
    }
  ];

  const cashFlowAnalysis = [
    {
      period: "Q1 2025",
      operating: "₦2.1B",
      investing: "-₦0.8B",
      financing: "-₦0.3B",
      net: "₦1.0B",
      trend: "up"
    },
    {
      period: "Q2 2025",
      operating: "₦2.3B",
      investing: "-₦1.2B",
      financing: "-₦0.2B",
      net: "₦0.9B",
      trend: "down"
    },
    {
      period: "Q3 2025",
      operating: "₦2.5B",
      investing: "-₦0.9B",
      financing: "-₦0.4B",
      net: "₦1.2B",
      trend: "up"
    },
    {
      period: "Q4 2025 (Est.)",
      operating: "₦2.7B",
      investing: "-₦1.5B",
      financing: "-₦0.5B",
      net: "₦0.7B",
      trend: "down"
    }
  ];

  const financialAlerts = [
    {
      id: 1,
      type: "Budget Alert",
      severity: "Medium",
      message: "HR Division approaching budget limit (102% utilized)",
      department: "Human Resources",
      amount: "₦4.9B / ₦4.8B",
      action: "Review and approve additional allocation"
    },
    {
      id: 2,
      type: "Revenue Opportunity",
      severity: "Low",
      message: "Pilotage services showing strong growth (+12.1%)",
      department: "Marine Operations",
      amount: "₦3.2B",
      action: "Consider capacity expansion"
    },
    {
      id: 3,
      type: "Cost Optimization",
      severity: "Low",
      message: "Personnel costs under budget by 5%",
      department: "All Divisions",
      amount: "₦15.2B / ₦16.0B",
      action: "Evaluate hiring opportunities"
    }
  ];

  const investmentProjects = [
    {
      project: "Port Infrastructure Upgrade",
      investment: "₦15.0B",
      roi: "18.5%",
      payback: "5.2 years",
      status: "In Progress",
      progress: 65
    },
    {
      project: "Digital Transformation",
      investment: "₦8.5B",
      roi: "22.3%",
      payback: "4.1 years",
      status: "Planning",
      progress: 25
    },
    {
      project: "Fleet Modernization",
      investment: "₦12.0B",
      roi: "15.8%",
      payback: "6.0 years",
      status: "Approved",
      progress: 10
    },
    {
      project: "Green Energy Initiative",
      investment: "₦6.2B",
      roi: "12.4%",
      payback: "7.5 years",
      status: "Feasibility Study",
      progress: 5
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Division Dashboard</h1>
          <p className="text-gray-600">Financial performance, budget management, and investment oversight</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/reports"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Financial Reports
          </Link>
          <Link
            href="/finance/budget"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Target className="w-4 h-4 mr-2" />
            Budget Management
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Financial Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Key Financial Metrics</h2>
          <Link
            href="/finance/metrics"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed metrics
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialMetrics.map((metric, index) => (
            <FinancialMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
            <Link
              href="/finance/revenue"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View revenue details
            </Link>
          </div>
          <div className="space-y-4">
            {revenueBreakdown.map((item, index) => (
              <RevenueItem key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Expense Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Expense Analysis</h2>
            <Link
              href="/finance/expenses"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View expense details
            </Link>
          </div>
          <div className="space-y-4">
            {expenseAnalysis.map((expense, index) => (
              <ExpenseItem key={index} expense={expense} />
            ))}
          </div>
        </div>
      </div>

      {/* Budget Performance */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Department Budget Performance</h2>
          <Link
            href="/finance/budget/departments"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all departments
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetPerformance.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.allocated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.spent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.remaining}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.utilization}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      dept.status === 'On Track' ? 'bg-green-100 text-green-800' :
                      dept.status === 'Over Budget' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow & Investment Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Cash Flow Analysis</h2>
            <Link
              href="/finance/cashflow"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View cash flow details
            </Link>
          </div>
          <div className="space-y-4">
            {cashFlowAnalysis.map((period, index) => (
              <CashFlowItem key={index} period={period} />
            ))}
          </div>
        </div>

        {/* Investment Projects */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Investment Projects</h2>
            <Link
              href="/finance/investments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage investments
            </Link>
          </div>
          <div className="space-y-4">
            {investmentProjects.map((project, index) => (
              <InvestmentProjectItem key={index} project={project} />
            ))}
          </div>
        </div>
      </div>

      {/* Financial Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Alerts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Financial Alerts</h2>
            <Link
              href="/finance/alerts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all alerts
            </Link>
          </div>
          <div className="space-y-4">
            {financialAlerts.map((alert) => (
              <FinancialAlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Finance Management Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="Budget Planning"
              description="Create and manage budgets"
              icon={Target}
              href="/finance/budget"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Financial Reports"
              description="Generate financial reports"
              icon={BarChart3}
              href="/finance/reports"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Investment Analysis"
              description="Evaluate investment opportunities"
              icon={TrendingUp}
              href="/finance/investments"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              title="Cost Management"
              description="Monitor and control costs"
              icon={Calculator}
              href="/finance/costs"
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              title="Cash Flow"
              description="Monitor cash flow"
              icon={DollarSign}
              href="/finance/cashflow"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="Financial Planning"
              description="Strategic financial planning"
              icon={PieChart}
              href="/finance/planning"
              color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const changeColorMap = {
    positive: "text-green-600",
    negative: "text-red-600",
    warning: "text-yellow-600",
    neutral: "text-gray-600"
  };
  const changeColor = changeColorMap[stat.changeType as keyof typeof changeColorMap] || "text-gray-600";

  return (
    <Link href={stat.href} className="block">
      <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${changeColor}`}>{stat.change}</span>
        </div>
      </div>
    </Link>
  );
}

function FinancialMetricCard({ metric }: { metric: any }) {
  const statusColorMap = {
    'Above Target': 'bg-green-100 text-green-800',
    'Below Target': 'bg-blue-100 text-blue-800',
    'On Target': 'bg-yellow-100 text-yellow-800',
    'Off Target': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
      <p className="text-xs text-gray-500">Target: {metric.target}</p>
      <p className="text-xs text-gray-400">{metric.period}</p>
    </div>
  );
}

function RevenueItem({ item }: { item: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{item.source}</h4>
          <p className="text-xs text-gray-500">{item.percentage} of total revenue</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{item.amount}</p>
        <p className={`text-sm font-medium ${
          item.trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {item.growth}
        </p>
      </div>
    </div>
  );
}

function ExpenseItem({ expense }: { expense: any }) {
  const statusColorMap = {
    'Under Budget': 'bg-green-100 text-green-800',
    'Over Budget': 'bg-red-100 text-red-800',
    'On Budget': 'bg-yellow-100 text-yellow-800'
  };
  const statusColor = statusColorMap[expense.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{expense.category}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Amount: {expense.amount} ({expense.percentage})</p>
            <p>Budget: {expense.budget}</p>
            <p>Variance: {expense.variance}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {expense.status}
        </span>
      </div>
    </div>
  );
}

function CashFlowItem({ period }: { period: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">{period.period}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          period.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {period.trend === 'up' ? 'Positive' : 'Negative'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Operating</p>
          <p className="font-medium text-green-600">{period.operating}</p>
        </div>
        <div>
          <p className="text-gray-500">Investing</p>
          <p className="font-medium text-red-600">{period.investing}</p>
        </div>
        <div>
          <p className="text-gray-500">Financing</p>
          <p className="font-medium text-red-600">{period.financing}</p>
        </div>
        <div>
          <p className="text-gray-500">Net Cash Flow</p>
          <p className="font-medium text-gray-900">{period.net}</p>
        </div>
      </div>
    </div>
  );
}

function InvestmentProjectItem({ project }: { project: any }) {
  const statusColorMap = {
    'In Progress': 'bg-blue-100 text-blue-800',
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Feasibility Study': 'bg-purple-100 text-purple-800'
  };
  const statusColor = statusColorMap[project.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{project.project}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Investment: {project.investment}</p>
            <p>ROI: {project.roi} | Payback: {project.payback}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {project.status}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function FinancialAlertItem({ alert }: { alert: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const severityColor = severityColorMap[alert.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-900">{alert.type}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Department: {alert.department}</p>
            <p>Amount: {alert.amount}</p>
            <p>Action: {alert.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  title,
  description,
  icon: Icon,
  href,
  color
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`p-4 rounded-lg transition-colors ${color}`}
    >
      <Icon className="h-8 w-8 mb-3" />
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs opacity-75">{description}</p>
    </Link>
  );
}
