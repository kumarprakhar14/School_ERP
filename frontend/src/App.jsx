import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';
import useAuthStore from './store/authStore';

import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import SchoolsManagement from './pages/super-admin/SchoolsManagement';
import SchoolDetail from './pages/super-admin/SchoolDetail';
import BugReports from './pages/super-admin/BugReports';
import SuperAdminProfile from './pages/super-admin/SuperAdminProfile';
import SuperAdminManagement from './pages/super-admin/SuperAdminManagement';
import Settings from './pages/admin/Settings';
import UserManagement from './pages/admin/UserManagement';
import AdminUserProfile from './pages/admin/AdminUserProfile';
import BulkImport from './pages/admin/BulkImport';

import Dashboard from './pages/Dashboard';
import AccountsDashboard from './pages/AccountsDashboard';
import Academics from './pages/Academics';
import Attendance from './pages/Attendance';
import Assignments from './pages/Assignments';
import Fees from './pages/Fees';
import Profile from './pages/Profile';
import TimeTable from './pages/TimeTable';

function DashboardRouter() {
  const user = useAuthStore(state => state.user);
  
  if (!user) return <Navigate to="/login" />;
  
  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin" replace />;
  } else if (user.role === 'ACCOUNTS') {
    return <AccountsDashboard />;
  } else {
    return <Dashboard />;
  }
}

function PublicRoute({ children }) {
  const { user, isInitialized, fetchProfile } = useAuthStore();
  
  React.useEffect(() => {
    if (!isInitialized) {
      fetchProfile();
    }
  }, [isInitialized, fetchProfile]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

import UserGuide from './pages/UserGuide';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          classNames: {
            toast: 'border shadow-lg rounded-xl flex gap-2 items-center w-full',
            title: 'font-medium text-sm',
            description: 'text-sm opacity-90',
            error: 'bg-red-50 border-red-200 text-red-800',
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
          }
        }}
      />
      <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/user-guide" element={<UserGuide />} />
        
        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardRouter />} />
            
            {/* Phase 2: Super Admin & Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="super-admin" element={<SuperAdminDashboard />} />
              <Route path="super-admin/schools" element={<SchoolsManagement />} />
              <Route path="super-admin/schools/:id" element={<SchoolDetail />} />
              <Route path="super-admin/bugs" element={<BugReports />} />
              <Route path="super-admin/profile" element={<SuperAdminProfile />} />
              <Route path="super-admin/managers" element={<SuperAdminManagement />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="admin/settings" element={<Settings />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/users/:id" element={<AdminUserProfile />} />
              <Route path="admin/import" element={<BulkImport />} />
            </Route>

            {/* Phase 3 & 4 routes */}
            <Route path="students" element={<div className="text-gray-600 p-6">Students Module Coming Soon...</div>} />
            <Route path="academics" element={<Academics />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="fees" element={<Fees />} />
            <Route path="timetable" element={<TimeTable />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
        
        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Router>
    </>
  );
}

export default App;
