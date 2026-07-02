import React, { useState, useEffect } from 'react';
import ReportFilterBar from './components/ReportFilterBar.jsx';
import AttendanceReportTab from './components/AttendanceReportTab.jsx';
import FeeReportTab from './components/FeeReportTab.jsx';
import useAuthStore from '../../store/authStore';
import { toast } from 'sonner';

export default function ReportsDashboard() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('');
  const [filters, setFilters] = useState({ preset: 'This Month' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'ACCOUNTS') {
      setActiveTab('fees');
    } else {
      setActiveTab('attendance');
    }
  }, [user]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleError = (error) => {
    toast.error(error?.response?.data?.message || 'Failed to fetch report data.');
  };

  if (!user || user.role === 'TEACHER' || user.role === 'STUDENT' || user.role === 'SUPER_ADMIN') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">You do not have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports & Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze school performance and financials.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-1.5 inline-flex border border-gray-200/50 shadow-sm">
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === 'attendance'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
          >
            Attendance Insights
          </button>
        )}
        {(user.role === 'ADMIN' || user.role === 'ACCOUNTS') && (
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === 'fees'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
          >
            Fee Insights
          </button>
        )}
      </div>

      <ReportFilterBar onFilterChange={handleFilterChange} isLoading={loading} />

      <div className="min-h-[500px]">
        {activeTab === 'attendance' && (
          <AttendanceReportTab 
            filters={filters} 
            setLoading={setLoading} 
            onError={handleError} 
          />
        )}
        {activeTab === 'fees' && (
          <FeeReportTab 
            filters={filters} 
            setLoading={setLoading} 
            onError={handleError} 
          />
        )}
      </div>
    </div>
  );
}
