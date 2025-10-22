'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import role-specific dashboards
import OfficerDashboard from '@/components/dashboards/OfficerDashboard';
import PrincipalManagerDashboard from '@/components/dashboards/PrincipalManagerDashboard';
import AGMDashboard from '@/components/dashboards/AGMDashboard';
import GMDashboard from '@/components/dashboards/GMDashboard';
import MDDashboard from '@/components/dashboards/MDDashboard';
import RegistryDashboard from '@/components/dashboards/RegistryDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ICTDivisionDashboard from '@/components/dashboards/ICTDivisionDashboard';
import MarineOperationsDashboard from '@/components/dashboards/MarineOperationsDashboard';
import FinanceDivisionDashboard from '@/components/dashboards/FinanceDivisionDashboard';
import HRDivisionDashboard from '@/components/dashboards/HRDivisionDashboard';
import SoftwareApplicationsDashboard from '@/components/dashboards/SoftwareApplicationsDashboard';
import NetworkInfrastructureDashboard from '@/components/dashboards/NetworkInfrastructureDashboard';
import PortOperationsDashboard from '@/components/dashboards/PortOperationsDashboard';
import FinancialPlanningDashboard from '@/components/dashboards/FinancialPlanningDashboard';

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string>('officer'); // Mock - will come from auth
  const [isLoading, setIsLoading] = useState(true);

  // Mock user role detection - in real app this would come from auth context/API
  useEffect(() => {
    // Simulate API call to get user role
    const mockUserRole = localStorage.getItem('mockUserRole') || 'officer';
    setUserRole(mockUserRole);
    setIsLoading(false);
  }, []);

  // Role switcher for testing (remove in production)
  const handleRoleChange = (newRole: string) => {
    setUserRole(newRole);
    localStorage.setItem('mockUserRole', newRole);
    // Force reload to update sidebar
    window.location.reload();
  };

  const dashboards: Record<string, React.ComponentType> = {
    'staff': OfficerDashboard,
    'junior_officer': OfficerDashboard,
    'officer': OfficerDashboard,
    'senior_officer': OfficerDashboard,
    'am': PrincipalManagerDashboard,
    'manager': PrincipalManagerDashboard,
    'sm': PrincipalManagerDashboard,
    'pm': PrincipalManagerDashboard,
    'agm': AGMDashboard,
    'gm': GMDashboard,
    'ed': GMDashboard,
    'md': MDDashboard,
    'secretary': MDDashboard, // Secretaries use their executive's dashboard
    'registry': RegistryDashboard,
    'admin': AdminDashboard,
    // Division-specific dashboards
    'ict_division': ICTDivisionDashboard,
    'marine_operations': MarineOperationsDashboard,
    'finance_division': FinanceDivisionDashboard,
    'hr_division': HRDivisionDashboard,
    // Department-specific dashboards
    'software_applications': SoftwareApplicationsDashboard,
    'network_infrastructure': NetworkInfrastructureDashboard,
    'port_operations': PortOperationsDashboard,
    'financial_planning': FinancialPlanningDashboard,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const DashboardComponent = dashboards[userRole] || OfficerDashboard;

  // Role switcher for testing (remove in production)
  const roleOptions = [
    { value: 'staff', label: 'Staff' },
    { value: 'junior_officer', label: 'Junior Officer' },
    { value: 'officer', label: 'Officer' },
    { value: 'senior_officer', label: 'Senior Officer' },
    { value: 'am', label: 'Assistant Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'sm', label: 'Senior Manager' },
    { value: 'pm', label: 'Principal Manager' },
    { value: 'agm', label: 'Assistant General Manager' },
    { value: 'gm', label: 'General Manager' },
    { value: 'ed', label: 'Executive Director' },
    { value: 'md', label: 'Managing Director' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'registry', label: 'Registry Officer' },
    { value: 'admin', label: 'System Administrator' },
    // Division-specific dashboards
    { value: 'ict_division', label: 'ICT Division Dashboard' },
    { value: 'marine_operations', label: 'Marine Operations Dashboard' },
    { value: 'finance_division', label: 'Finance Division Dashboard' },
    { value: 'hr_division', label: 'HR Division Dashboard' },
    // Department-specific dashboards
    { value: 'software_applications', label: 'Software Applications Department' },
    { value: 'network_infrastructure', label: 'Network Infrastructure Department' },
    { value: 'port_operations', label: 'Port Operations Department' },
    { value: 'financial_planning', label: 'Financial Planning Department' },
  ];

  return (
    <div className="space-y-6">
      {/* Role Switcher for Testing */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Role Testing Switcher</h3>
            <p className="text-xs text-yellow-600 mt-1">Switch roles to test different dashboards (for development only)</p>
          </div>
          <select
            value={userRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-3 py-2 border border-yellow-300 rounded-md text-sm focus:ring-yellow-500 focus:border-yellow-500"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Content */}
      <DashboardComponent />
    </div>
  );
}
