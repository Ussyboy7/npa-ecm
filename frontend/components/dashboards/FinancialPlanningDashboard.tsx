"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  FileText,
  Download,
  Upload,
  Eye,
  Settings,
  Activity,
  Calendar,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Shield,
  Award,
  Globe,
  MapPin,
  CreditCard,
  Banknote,
  Receipt,
  Wallet,
  Coins,
  Landmark
} from "lucide-react";
import Link from "next/link";

export default function FinancialPlanningDashboard() {
  const stats = [
    {
      name: "Budget Utilization",
      value: "87%",
      change: "+3%",
      changeType: "positive",
      icon: Target,
      description: "Annual budget progress",
      href: "/finance/planning/budget"
    },
    {
      name: "Revenue Forecast Accuracy",
      value: "94%",
      change: "+2%",
      changeType: "positive",
      icon: TrendingUp,
      description: "Forecast vs actual",
      href: "/finance/planning/forecasts"
    },
    {
      name: "Cost Variance",
      value: "2.3%",
      change: "-0.8%",
      changeType: "positive",
      icon: Calculator,
      description: "Budget vs actual",
      href: "/finance/planning/variance"
    },
    {
      name: "Investment ROI",
      value: "18.5%",
      change: "+1.2%",
      changeType: "positive",
      icon: PieChart,
      description: "Portfolio performance",
      href: "/finance/planning/investments"
    }
  ];

  const budgetAnalysis = [
    {
      department: "Marine Operations",
      allocated: "₦12.5B",
      spent: "₦10.8B",
      remaining: "₦1.7B",
      utilization: "86%",
      variance: "-2.1%",
      status: "On Track",
      forecast: "₦12.2B"
    },
    {
      department: "ICT Division",
      allocated: "₦8.2B",
      spent: "₦7.1B",
      remaining: "₦1.1B",
      utilization: "87%",
      variance: "-1.8%",
      status: "On Track",
      forecast: "₦8.0B"
    },
    {
      department: "Finance Division",
      allocated: "₦3.5B",
      spent: "₦3.2B",
      remaining: "₦0.3B",
      utilization: "91%",
      variance: "-0.5%",
      status: "On Track",
      forecast: "₦3.4B"
    },
    {
      department: "Human Resources",
      allocated: "₦4.8B",
      spent: "₦4.9B",
      remaining: "-₦0.1B",
      utilization: "102%",
      variance: "+2.1%",
      status: "Over Budget",
      forecast: "₦5.1B"
    }
  ];

  const financialForecasts = [
    {
      period: "Q1 2025",
      revenue: "₦11.2B",
      expenses: "₦7.8B",
      profit: "₦3.4B",
      accuracy: "96%",
      trend: "up"
    },
    {
      period: "Q2 2025",
      revenue: "₦12.5B",
      expenses: "₦8.2B",
      profit: "₦4.3B",
      accuracy: "94%",
      trend: "up"
    },
    {
      period: "Q3 2025",
      revenue: "₦13.8B",
      expenses: "₦8.9B",
      profit: "₦4.9B",
      accuracy: "92%",
      trend: "up"
    },
    {
      period: "Q4 2025",
      revenue: "₦15.1B",
      expenses: "₦9.5B",
      profit: "₦5.6B",
      accuracy: "90%",
      trend: "up"
    }
  ];

  const investmentPortfolio = [
    {
      investment: "Port Infrastructure Upgrade",
      amount: "₦15.0B",
      roi: "18.5%",
      payback: "5.2 years",
      risk: "Medium",
      status: "Active",
      performance: "Above Target"
    },
    {
      investment: "Digital Transformation",
      amount: "₦8.5B",
      roi: "22.3%",
      payback: "4.1 years",
      risk: "High",
      status: "Active",
      performance: "Above Target"
    },
    {
      investment: "Fleet Modernization",
      amount: "₦12.0B",
      roi: "15.8%",
      payback: "6.0 years",
      risk: "Low",
      status: "Planning",
      performance: "On Target"
    },
    {
      investment: "Green Energy Initiative",
      amount: "₦6.2B",
      roi: "12.4%",
      payback: "7.5 years",
      risk: "Medium",
      status: "Feasibility Study",
      performance: "Below Target"
    }
  ];

  const costCenterAnalysis = [
    {
      costCenter: "Personnel Costs",
      budget: "₦16.0B",
      actual: "₦15.2B",
      variance: "-5.0%",
      trend: "down",
      status: "Under Budget"
    },
    {
      costCenter: "Operations & Maintenance",
      budget: "₦8.0B",
      actual: "₦8.5B",
      variance: "+6.3%",
      trend: "up",
      status: "Over Budget"
    },
    {
      costCenter: "Infrastructure",
      budget: "₦4.0B",
      actual: "₦3.8B",
      variance: "-5.0%",
      trend: "down",
      status: "Under Budget"
    },
    {
      costCenter: "Administrative",
      budget: "₦1.5B",
      actual: "₦1.2B",
      variance: "-20.0%",
      trend: "down",
      status: "Under Budget"
    }
  ];

  const financialKPIs = [
    {
      kpi: "Revenue Growth Rate",
      current: "12.5%",
      target: "10.0%",
      trend: "up",
      status: "Above Target",
      period: "Year over Year"
    },
    {
      kpi: "Operating Margin",
      current: "36.4%",
      target: "35.0%",
      trend: "up",
      status: "Above Target",
      period: "Current quarter"
    },
    {
      kpi: "Cash Conversion Cycle",
      current: "45 days",
      target: "50 days",
      trend: "down",
      status: "Below Target",
      period: "Average"
    },
    {
      kpi: "Debt-to-Equity Ratio",
      current: "0.35",
      target: "0.40",
      trend: "down",
      status: "Below Target",
      period: "Current"
    }
  ];

  const budgetAlerts = [
    {
      id: 1,
      type: "Budget Alert",
      severity: "High",
      message: "HR Division approaching budget limit (102% utilized)",
      department: "Human Resources",
      amount: "₦4.9B / ₦4.8B",
      action: "Review and approve additional allocation",
      timeframe: "Immediate"
    },
    {
      id: 2,
      type: "Cost Variance Alert",
      severity: "Medium",
      message: "Operations & Maintenance costs 6.3% over budget",
      department: "All Divisions",
      amount: "₦8.5B / ₦8.0B",
      action: "Investigate cost drivers and implement controls",
      timeframe: "1 week"
    },
    {
      id: 3,
      type: "Investment Opportunity",
      severity: "Low",
      message: "Digital Transformation showing strong ROI (22.3%)",
      department: "ICT Division",
      amount: "₦8.5B investment",
      action: "Consider additional funding for expansion",
      timeframe: "1 month"
    }
  ];

  const cashFlowProjections = [
    {
      month: "January 2025",
      operating: "₦2.1B",
      investing: "-₦0.8B",
      financing: "-₦0.3B",
      net: "₦1.0B",
      cumulative: "₦1.0B"
    },
    {
      month: "February 2025",
      operating: "₦2.3B",
      investing: "-₦1.2B",
      financing: "-₦0.2B",
      net: "₦0.9B",
      cumulative: "₦1.9B"
    },
    {
      month: "March 2025",
      operating: "₦2.5B",
      investing: "-₦0.9B",
      financing: "-₦0.4B",
      net: "₦1.2B",
      cumulative: "₦3.1B"
    },
    {
      month: "April 2025",
      operating: "₦2.7B",
      investing: "-₦1.5B",
      financing: "-₦0.5B",
      net: "₦0.7B",
      cumulative: "₦3.8B"
    }
  ];

  const scenarioAnalysis = [
    {
      scenario: "Optimistic",
      probability: "25%",
      revenue: "₦52.0B",
      profit: "₦19.2B",
      roi: "22.5%",
      description: "Strong economic growth, increased trade volumes"
    },
    {
      scenario: "Base Case",
      probability: "50%",
      revenue: "₦48.5B",
      profit: "₦17.8B",
      roi: "18.5%",
      description: "Moderate growth, stable market conditions"
    },
    {
      scenario: "Pessimistic",
      probability: "25%",
      revenue: "₦44.2B",
      profit: "₦15.1B",
      roi: "14.2%",
      description: "Economic downturn, reduced trade activity"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Planning Department</h1>
          <p className="text-gray-600">Budget management, financial forecasting, and investment planning</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/budget"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Target className="w-4 h-4 mr-2" />
            Budget Planning
          </Link>
          <Link
            href="/finance/planning/forecasts"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Financial Forecasts
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Key Financial Indicators</h2>
          <Link
            href="/finance/planning/kpis"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed KPIs
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialKPIs.map((kpi, index) => (
            <KPICard key={index} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Budget Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Department Budget Analysis</h2>
          <Link
            href="/finance/planning/budget/departments"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetAnalysis.map((dept, index) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.variance}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Forecasts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Financial Forecasts</h2>
            <Link
              href="/finance/planning/forecasts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage forecasts
            </Link>
          </div>
          <div className="space-y-4">
            {financialForecasts.map((forecast, index) => (
              <ForecastItem key={index} forecast={forecast} />
            ))}
          </div>
        </div>

        {/* Investment Portfolio */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Investment Portfolio</h2>
            <Link
              href="/finance/planning/investments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage investments
            </Link>
          </div>
          <div className="space-y-4">
            {investmentPortfolio.map((investment, index) => (
              <InvestmentItem key={index} investment={investment} />
            ))}
          </div>
        </div>
      </div>

      {/* Cost Center Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Cost Center Analysis</h2>
          <Link
            href="/finance/planning/cost-centers"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View cost centers
          </Link>
        </div>
        <div className="space-y-4">
          {costCenterAnalysis.map((costCenter, index) => (
            <CostCenterItem key={index} costCenter={costCenter} />
          ))}
        </div>
      </div>

      {/* Cash Flow Projections & Scenario Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Projections */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Cash Flow Projections</h2>
            <Link
              href="/finance/planning/cashflow"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View cash flow details
            </Link>
          </div>
          <div className="space-y-4">
            {cashFlowProjections.map((projection, index) => (
              <CashFlowItem key={index} projection={projection} />
            ))}
          </div>
        </div>

        {/* Scenario Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Scenario Analysis</h2>
            <Link
              href="/finance/planning/scenarios"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage scenarios
            </Link>
          </div>
          <div className="space-y-4">
            {scenarioAnalysis.map((scenario, index) => (
              <ScenarioItem key={index} scenario={scenario} />
            ))}
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Budget Alerts</h2>
          <Link
            href="/finance/planning/alerts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all alerts
          </Link>
        </div>
        <div className="space-y-4">
          {budgetAlerts.map((alert) => (
            <BudgetAlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Financial Planning Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Budget Planning"
            description="Create and manage budgets"
            icon={Target}
            href="/finance/planning/budget"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Financial Forecasting"
            description="Revenue and expense forecasts"
            icon={TrendingUp}
            href="/finance/planning/forecasts"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Investment Analysis"
            description="Evaluate investment opportunities"
            icon={PieChart}
            href="/finance/planning/investments"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Cost Management"
            description="Monitor and control costs"
            icon={Calculator}
            href="/finance/planning/costs"
            color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          />
          <QuickActionButton
            title="Cash Flow Planning"
            description="Manage cash flow projections"
            icon={DollarSign}
            href="/finance/planning/cashflow"
            color="bg-red-50 text-red-600 hover:bg-red-100"
          />
          <QuickActionButton
            title="Scenario Planning"
            description="What-if analysis"
            icon={BarChart3}
            href="/finance/planning/scenarios"
            color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          />
          <QuickActionButton
            title="Financial Reports"
            description="Generate planning reports"
            icon={FileText}
            href="/finance/planning/reports"
            color="bg-pink-50 text-pink-600 hover:bg-pink-100"
          />
          <QuickActionButton
            title="KPI Dashboard"
            description="Financial performance metrics"
            icon={Activity}
            href="/finance/planning/kpis"
            color="bg-gray-50 text-gray-600 hover:bg-gray-100"
          />
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

function KPICard({ kpi }: { kpi: any }) {
  const statusColorMap = {
    'Above Target': 'bg-green-100 text-green-800',
    'Below Target': 'bg-blue-100 text-blue-800',
    'On Target': 'bg-yellow-100 text-yellow-800',
    'Off Target': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[kpi.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{kpi.kpi}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {kpi.status}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{kpi.current}</p>
      <p className="text-xs text-gray-500">Target: {kpi.target}</p>
      <p className="text-xs text-gray-400">{kpi.period}</p>
    </div>
  );
}

function ForecastItem({ forecast }: { forecast: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">{forecast.period}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          forecast.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {forecast.trend === 'up' ? 'Positive' : 'Negative'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Revenue</p>
          <p className="font-medium text-green-600">{forecast.revenue}</p>
        </div>
        <div>
          <p className="text-gray-500">Expenses</p>
          <p className="font-medium text-red-600">{forecast.expenses}</p>
        </div>
        <div>
          <p className="text-gray-500">Profit</p>
          <p className="font-medium text-blue-600">{forecast.profit}</p>
        </div>
        <div>
          <p className="text-gray-500">Accuracy</p>
          <p className="font-medium text-gray-900">{forecast.accuracy}</p>
        </div>
      </div>
    </div>
  );
}

function InvestmentItem({ investment }: { investment: any }) {
  const riskColorMap = {
    'Low': 'bg-green-100 text-green-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'High': 'bg-red-100 text-red-800'
  };
  const riskColor = riskColorMap[investment.risk as keyof typeof riskColorMap] || 'bg-gray-100 text-gray-800';

  const statusColorMap = {
    'Active': 'bg-blue-100 text-blue-800',
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Feasibility Study': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-green-100 text-green-800'
  };
  const statusColor = statusColorMap[investment.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{investment.investment}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Amount: {investment.amount}</p>
            <p>ROI: {investment.roi} | Payback: {investment.payback}</p>
            <p>Performance: {investment.performance}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {investment.status}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskColor} ml-2`}>
            {investment.risk}
          </span>
        </div>
      </div>
    </div>
  );
}

function CostCenterItem({ costCenter }: { costCenter: any }) {
  const statusColorMap = {
    'Under Budget': 'bg-green-100 text-green-800',
    'Over Budget': 'bg-red-100 text-red-800',
    'On Budget': 'bg-yellow-100 text-yellow-800'
  };
  const statusColor = statusColorMap[costCenter.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{costCenter.costCenter}</h4>
        <div className="text-sm text-gray-600 space-y-1 mt-2">
          <p>Budget: {costCenter.budget} | Actual: {costCenter.actual}</p>
          <p>Variance: {costCenter.variance}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {costCenter.status}
        </span>
        <p className={`text-sm font-medium mt-1 ${
          costCenter.trend === 'up' ? 'text-red-600' : 'text-green-600'
        }`}>
          {costCenter.trend === 'up' ? '↗' : '↘'}
        </p>
      </div>
    </div>
  );
}

function CashFlowItem({ projection }: { projection: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">{projection.month}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          parseFloat(projection.net.replace('₦', '').replace('B', '')) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {parseFloat(projection.net.replace('₦', '').replace('B', '')) > 0 ? 'Positive' : 'Negative'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Operating</p>
          <p className="font-medium text-green-600">{projection.operating}</p>
        </div>
        <div>
          <p className="text-gray-500">Investing</p>
          <p className="font-medium text-red-600">{projection.investing}</p>
        </div>
        <div>
          <p className="text-gray-500">Financing</p>
          <p className="font-medium text-red-600">{projection.financing}</p>
        </div>
        <div>
          <p className="text-gray-500">Net Cash Flow</p>
          <p className="font-medium text-gray-900">{projection.net}</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">Cumulative: {projection.cumulative}</p>
      </div>
    </div>
  );
}

function ScenarioItem({ scenario }: { scenario: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{scenario.scenario}</h4>
          <p className="text-xs text-gray-500 mt-1">{scenario.description}</p>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {scenario.probability}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Revenue</p>
          <p className="font-medium text-green-600">{scenario.revenue}</p>
        </div>
        <div>
          <p className="text-gray-500">Profit</p>
          <p className="font-medium text-blue-600">{scenario.profit}</p>
        </div>
        <div>
          <p className="text-gray-500">ROI</p>
          <p className="font-medium text-purple-600">{scenario.roi}</p>
        </div>
      </div>
    </div>
  );
}

function BudgetAlertItem({ alert }: { alert: any }) {
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
            <p>Timeframe: {alert.timeframe}</p>
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
