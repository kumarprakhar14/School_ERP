import React from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 focus:outline-none">
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          <Bell className="h-5 w-5" />
        </button>
        
        <div className="flex items-center space-x-4 border-l border-gray-200 pl-4">
          <div className="flex items-center p-1 pr-3 rounded-full hover:bg-gray-50 transition-colors border border-transparent">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-600 mr-2 shadow-inner">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-700 leading-tight">{user?.name || 'Loading...'}</span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{user?.role || ''}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
