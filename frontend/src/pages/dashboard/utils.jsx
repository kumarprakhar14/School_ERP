import React from 'react';
import { 
  UserPlus, UserCheck, Bell, DollarSign, CalendarCheck, Database, Activity 
} from 'lucide-react';

/**
 * Returns a time-of-day greeting string based on the current hour.
 * Used by AdminDashboard and GeneralDashboard welcome banners.
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Returns the current date formatted as a human-readable string (e.g., "Thursday, 12 June 2025").
 * Used by AdminDashboard welcome banner and onboarding header.
 */
export const getCurrentDateText = () => {
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Date().toLocaleDateString('en-IN', options);
};

/**
 * Returns the appropriate lucide-react icon element for a given activity type.
 * Used by AdminDashboard's Recent Campus Activities timeline to render
 * type-specific icons (e.g., STUDENT_ADDED → UserPlus, FEE_PAID → DollarSign).
 */
export const getActivityIcon = (type) => {
  switch (type) {
    case 'STUDENT_ADDED':
      return <UserPlus className="w-4 h-4 text-blue-600" />;
    case 'TEACHER_ADDED':
      return <UserCheck className="w-4 h-4 text-emerald-600" />;
    case 'NOTICE_PUBLISHED':
      return <Bell className="w-4 h-4 text-purple-600" />;
    case 'FEE_PAID':
      return <DollarSign className="w-4 h-4 text-indigo-600" />;
    case 'ATTENDANCE_SUBMITTED':
      return <CalendarCheck className="w-4 h-4 text-sky-600" />;
    case 'IMPORT_COMPLETED':
      return <Database className="w-4 h-4 text-amber-600" />;
    default:
      return <Activity className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Returns a CSS class string for activity type background and border styling.
 * Used by AdminDashboard's Recent Campus Activities timeline dots
 * to color-code each activity entry by its type.
 */
export const getActivityBg = (type) => {
  switch (type) {
    case 'STUDENT_ADDED':
      return 'bg-blue-50 border-blue-100';
    case 'TEACHER_ADDED':
      return 'bg-emerald-50 border-emerald-100';
    case 'NOTICE_PUBLISHED':
      return 'bg-purple-50 border-purple-100';
    case 'FEE_PAID':
      return 'bg-indigo-50 border-indigo-100';
    case 'ATTENDANCE_SUBMITTED':
      return 'bg-sky-50 border-sky-100';
    case 'IMPORT_COMPLETED':
      return 'bg-amber-50 border-amber-100';
    default:
      return 'bg-gray-50 border-gray-100';
  }
};

/**
 * Formats an activity timestamp into a human-readable relative time string.
 * Returns "Just now", "Xm ago", "Xh ago", "Yesterday", or a short date (e.g., "Jun 12").
 * Used by AdminDashboard's Recent Campus Activities timeline entries.
 */
export const formatActivityTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};
