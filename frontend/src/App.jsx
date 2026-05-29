import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';
import useAuthStore from './store/authStore';

import SchoolsList from './pages/super-admin/SchoolsList';
import Settings from './pages/admin/Settings';
import UserManagement from './pages/admin/UserManagement';

import Dashboard from './pages/Dashboard';
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
    return <Navigate to="/super-admin/schools" replace />;
  } else {
    return <Dashboard />;
  }
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardRouter />} />
            
            {/* Phase 2: Super Admin & Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="super-admin/schools" element={<SchoolsList />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="admin/settings" element={<Settings />} />
              <Route path="admin/users" element={<UserManagement />} />
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
      </Routes>
    </Router>
  );
}

export default App;
