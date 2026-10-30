import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';

export const AppLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar whenever route changes (React 19 pattern: adjust state during render)
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileSidebarOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink-900 font-sans selection:bg-seal-tint selection:text-seal-dark">
      {/* Persistent Top Bar with Mobile Menu Toggle */}
      <TopBar onToggleMobileMenu={() => setMobileSidebarOpen(prev => !prev)} />

      {/* Body Container: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (hidden on <lg, fixed-width on lg+) */}
        <div className="hidden lg:block h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay Drawer (<lg) */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer Sheet */}
            <div className="relative z-10 w-72 bg-paper-sheet h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b border-paper-border flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-seal uppercase tracking-wider">
                  Menu &amp; Role Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-paper-subtle transition-colors focus-visible:ring-2 focus-visible:ring-seal"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
