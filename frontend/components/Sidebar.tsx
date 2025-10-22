"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FileText,
  Workflow,
  CheckCircle,
  Search,
  Archive,
  BarChart3,
  Settings,
  Users,
  Home,
  LogOut,
  Bell,
  X,
  Plus,
  Send,
  Mail,
  Inbox,
  List,
  Upload,
  Activity,
  Crown,
  Building,
  ArrowRight,
  Play
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Role-based navigation configuration
const getNavigationItems = (role: string = 'officer') => {
  const baseItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
  ];

  // Officer/Staff level navigation
  const officerItems = [
    { name: "My Memos", href: "/memos", icon: FileText },
    { name: "Create Memo", href: "/memos/create", icon: Plus },
    { name: "Create Document", href: "/documents/create", icon: FileText },
    { name: "Upload Document", href: "/documents/new", icon: Upload },
    { name: "Correspondence", href: "/correspondence", icon: Mail },
    { name: "Sent Items", href: "/memos/sent", icon: Send },
    { name: "Search", href: "/search", icon: Search },
    { name: "Workflow Simulation", href: "/simulation/memo-workflow", icon: Play },
  ];

  // Manager level navigation
  const managerItems = [
    { name: "Pending Approvals", href: "/approvals", icon: CheckCircle },
    { name: "Team Documents", href: "/memos/team", icon: Users },
    { name: "Create Document", href: "/documents/create", icon: FileText },
    { name: "Upload Document", href: "/documents/new", icon: Upload },
    { name: "Forward & Review", href: "/workflows/forward", icon: ArrowRight },
    { name: "Correspondence", href: "/correspondence", icon: Mail },
    { name: "Department Reports", href: "/reports/department", icon: BarChart3 },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Archive", href: "/archive", icon: Archive },
  ];

  // Executive level navigation
  const executiveItems = [
    { name: "My Inbox", href: "/inbox", icon: Inbox },
    { name: "Correspondence", href: "/correspondence", icon: Mail },
    { name: "MD Minutes & Review", href: "/md/minutes", icon: Crown },
    { name: "Divisional Reports", href: "/reports/division", icon: BarChart3 },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Executive Dashboard", href: "/reports/executive", icon: Crown },
  ];

  // Secretary navigation
  const secretaryItems = [
    { name: "Secretary Queue", href: "/secretary/queue", icon: List },
    { name: "Register Correspondence", href: "/correspondence/register", icon: Upload },
    { name: "Executive's Inbox", href: "/inbox", icon: Inbox },
    { name: "Correspondence Tracking", href: "/correspondence/tracking", icon: Activity },
  ];

  // Registry navigation
  const registryItems = [
    { name: "Approved Documents", href: "/registry/approved", icon: CheckCircle },
    { name: "Incoming Logs", href: "/registry/incoming", icon: Upload },
    { name: "Outgoing Records", href: "/registry/outgoing", icon: Send },
    { name: "Document Search", href: "/registry/search", icon: Search },
    { name: "Archive Management", href: "/registry/archive", icon: Archive },
  ];

  // Determine navigation based on role
  if (['registry'].includes(role)) {
    return [...baseItems, ...registryItems];
  }
  if (['secretary'].includes(role)) {
    return [...baseItems, ...secretaryItems];
  }
  if (['md', 'ed', 'gm', 'agm'].includes(role)) {
    return [...baseItems, ...executiveItems];
  }
  if (['pm', 'sm', 'manager', 'am'].includes(role)) {
    return [...baseItems, ...managerItems];
  }
  // Default to officer navigation
  return [...baseItems, ...officerItems];
};

const getAdminItems = (role: string = 'officer') => {
  // Only show admin items for admin role
  if (role === 'admin') {
    return [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Departments", href: "/admin/departments", icon: Building },
      { name: "Templates", href: "/admin/templates", icon: FileText },
      { name: "Workflows", href: "/admin/workflows", icon: Workflow },
      { name: "Audit Logs", href: "/admin/audit", icon: FileText },
      { name: "System", href: "/admin/system", icon: Settings },
    ];
  }
  return [];
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('officer');

  useEffect(() => {
    // Safely access localStorage only on client side
    const role = localStorage.getItem('mockUserRole') || 'officer';
    setUserRole(role);
  }, []);

  // Get navigation items based on role
  const navigationItems = getNavigationItems(userRole);
  const adminItems = getAdminItems(userRole);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-3 space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                    onClick={onClose}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-blue-700" : "text-gray-400"
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Admin Section */}
            <div className="mt-8">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </h3>
              </div>
              <div className="px-3 space-y-1">
                {adminItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      onClick={onClose}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive ? "text-blue-700" : "text-gray-400"
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
