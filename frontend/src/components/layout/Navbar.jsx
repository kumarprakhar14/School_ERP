import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, ChevronDown, Settings as SettingsIcon, Menu } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import ConfirmDialog from '../ui/ConfirmDialog';
import useDebounce from '../../hooks/useDebounce';
import api from '../../lib/api';

const routeMapper = (type, id, role) => {
  switch (type) {
    case 'school': return `/super-admin/schools/${id}`;
    case 'student': 
    case 'teacher':
    case 'admin':
    case 'accounts':
      return role === 'ADMIN' ? `/admin/users/${id}` : '#'; // Fallback if other roles lack a public profile view
    case 'notice': return '/'; // The dashboard holds the notice board
    case 'assignment': return '/assignments';
    case 'invoice': return '/fees';
    case 'payment': return '/fees';
    default: return '/';
  }
};

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [flatResults, setFlatResults] = useState([]); // Flattened array for keyboard nav

  const debouncedQuery = useDebounce(searchQuery, 300);

  const notifRef = useRef();
  const profileRef = useRef();
  const searchContainerRef = useRef();
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handle Search API Calls
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSearchResults(null);
      setFlatResults([]);
      setIsSearching(false);
      return;
    }

    const fetchSearch = async () => {
      setIsSearching(true);
      setShowSearchResults(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: abortControllerRef.current.signal
        });
        setSearchResults(response.data);
        
        // Flatten results for keyboard navigation
        const flat = [];
        Object.values(response.data).forEach(arr => {
          flat.push(...arr);
        });
        setFlatResults(flat);
        setSelectedIndex(-1);
      } catch (error) {
        if (error.name !== 'CanceledError') {
          console.error('Search error:', error);
          setSearchResults({});
          setFlatResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    };

    fetchSearch();
  }, [debouncedQuery]);

  const handleKeyDown = (e) => {
    if (!showSearchResults || flatResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  const handleSelectResult = (item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults(null);
    setFlatResults([]);
    navigate(routeMapper(item.type, item.id, user?.role));
  };

  return (
    <header className="h-16 bg-white/70 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center flex-1 max-w-xl">
        <button 
          onClick={toggleSidebar}
          className="mr-3 md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative group flex-1" ref={searchContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 3) setShowSearchResults(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery.length >= 3) setShowSearchResults(true);
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-300 sm:text-sm"
            placeholder="Search by names, ERP Id or notices..."
          />

          {showSearchResults && searchQuery.length >= 3 && (
            <div className="absolute mt-2 w-full max-w-2xl bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[70vh]">
              {isSearching && !searchResults ? (
                <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
              ) : flatResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No results found for "{searchQuery}"</div>
              ) : (
                <div className="overflow-y-auto p-2 space-y-4">
                  {Object.entries(searchResults).map(([category, items]) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category}>
                        <h3 className="px-3 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {category}
                        </h3>
                        <ul className="space-y-1">
                          {items.map((item) => {
                            const globalIndex = flatResults.findIndex(r => r.id === item.id && r.type === item.type);
                            const isSelected = selectedIndex === globalIndex;
                            return (
                              <li key={`${item.type}-${item.id}`}>
                                <button
                                  onClick={() => handleSelectResult(item)}
                                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex flex-col ${
                                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                    {item.title}
                                  </span>
                                  {item.subtitle && (
                                    <span className={`text-xs ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                                      {item.subtitle}
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
              <div className="flex flex-col text-left mr-1 hidden sm:flex">
                <span className="text-sm font-medium text-gray-700 leading-tight">{user?.name || 'Loading...'}</span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{user?.role || ''}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <Link
                  to={user?.role === 'SUPER_ADMIN' ? "/super-admin/profile" : "/profile"}
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
                    setShowLogoutConfirm(true);
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

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
