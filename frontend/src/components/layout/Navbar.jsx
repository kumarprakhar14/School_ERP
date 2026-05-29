import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifRef = useRef();
  const profileRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/70 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-300 sm:text-sm"
            placeholder="Search students, classes, or notices..."
          />
        </div>
      </div>
      
      <div className="ml-4 flex items-center space-x-4">
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 focus:outline-none"
          >
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            <Bell className="h-5 w-5" />
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="p-4 text-center text-sm text-gray-500 flex flex-col items-center">
                <Bell className="h-8 w-8 text-gray-300 mb-2" />
                <p>No new notifications right now.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 border-l border-gray-200 pl-4">
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center p-1 pr-2 rounded-full hover:bg-gray-50 transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-600 mr-2 shadow-inner overflow-hidden">
                {user?.profilePicUrl ? (
                  <img src={user.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col text-left mr-1">
                <span className="text-sm font-medium text-gray-700 leading-tight">{user?.name || 'Loading...'}</span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{user?.role || ''}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  My Profile
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2 text-gray-400" />
                    School Settings
                  </Link>
                )}
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2 text-red-500" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
