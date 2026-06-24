import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ErrorBoundary from '../ui/ErrorBoundary';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen print:h-auto bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden print:overflow-visible print:block">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="print:hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      <div className="flex-1 flex flex-col relative min-w-0 print:block">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none print:hidden"></div>
        <div className="print:hidden">
          <Navbar toggleSidebar={() => setIsSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible bg-transparent p-4 md:p-6 print:p-0 z-10">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out print:max-w-none">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
