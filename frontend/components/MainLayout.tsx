"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top bar - spans full width, fixed at top */}
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        showMenuButton={true}
      />

      {/* Sidebar - positioned below topbar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="pl-0 lg:pl-64 pt-16 min-h-screen bg-gray-50">
        {/* Page content with responsive padding */}
        <main
          id="main-content"
          className="p-3 sm:p-4 md:p-6 w-full overflow-x-hidden"
          role="main"
          aria-label="Main content"
        >
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
