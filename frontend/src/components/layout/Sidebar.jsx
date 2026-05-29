import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, FileText, Settings, BookOpen, Building2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const roleNavItems = {
  SUPER_ADMIN: [
    { icon: Building2, label: 'Schools', path: '/super-admin/schools' },
  ],
  ADMIN: [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: BookOpen, label: 'Academics', path: '/academics' },
    { icon: Calendar, label: 'Time Table', path: '/timetable' },
    { icon: Settings, label: 'School Settings', path: '/admin/settings' },
  ],
  TEACHER: [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Calendar, label: 'Attendance', path: '/attendance' },
    { icon: Calendar, label: 'Time Table', path: '/timetable' },
    { icon: BookOpen, label: 'Academics', path: '/academics' },
    { icon: FileText, label: 'Assignments', path: '/assignments' },
  ],
  ACCOUNTS: [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: FileText, label: 'Fees', path: '/fees' },
  ],
  STUDENT: [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'Academics', path: '/academics' },
    { icon: Calendar, label: 'Time Table', path: '/timetable' },
    { icon: FileText, label: 'Assignments', path: '/assignments' },
    { icon: FileText, label: 'Fees', path: '/fees' },
  ]
};

export default function Sidebar() {
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const navItems = user ? (roleNavItems[user.role] || []) : [];

  return (
    <aside className="w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
        {user?.role === 'SUPER_ADMIN' ? (
          <>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
              E
            </div>
            <span className="ml-3 font-semibold text-gray-800 text-lg tracking-tight">Edu<span className="text-blue-600">Core</span></span>
          </>
        ) : (
          <>
            {user?.schoolSettings?.logoUrl ? (
              <img src={user.schoolSettings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
                {user?.schoolName ? user.schoolName.charAt(0) : 'E'}
              </div>
            )}
            <span className="ml-3 font-semibold text-gray-800 text-sm tracking-tight truncate max-w-[140px]" title={user?.schoolName}>
              {user?.schoolName || 'School ERP'}
            </span>
          </>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${isActive 
                  ? 'text-blue-700 bg-blue-50/80 font-medium' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md"></div>
              )}
              <Icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110 text-blue-600' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 border border-blue-100/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-400/10 rounded-full blur-xl group-hover:bg-blue-400/20 transition-all duration-500"></div>
          <p className="text-xs font-semibold text-blue-800 mb-1">Need Help?</p>
          <p className="text-xs text-blue-600/80 mb-3">Check our docs</p>
          <button className="w-full py-1.5 bg-white text-blue-700 text-xs font-medium rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-all">
            Documentation
          </button>
        </div>
      </div>
    </aside>
  );
}
