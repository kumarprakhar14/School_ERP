import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isInitialized, fetchProfile } = useAuthStore();

  useEffect(() => {
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="p-8 text-center"><h2 className="text-2xl font-bold text-red-600">Access Denied</h2><p>You do not have permission to view this page.</p></div>;
  }

  return <Outlet />;
}
