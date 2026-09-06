import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { BookOpen, LogIn, AlertCircle, X } from 'lucide-react';

export default function Login() {
  const [erpId, setErpId] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [error, setError] = useState('');
  const [showGratitude, setShowGratitude] = useState(true);
  
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname ? `${location.state.from.pathname}${location.state.from.search || ''}` : null)
    || new URLSearchParams(location.search).get('redirect')
    || (() => { try { return sessionStorage.getItem('redirectAfterLogin'); } catch { return null; } })()
    || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(erpId, password, schoolId);
    if (res.success) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(from, { replace: true });
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50/20 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">

      {/* <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div> */}
      
      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="flex justify-center">
          <div className="w-12 sm:w-16 flex items-center justify-center">
            <img 
              src="/App_logo_light.png" 
              alt="SchoolChakra Icon"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3 w-full">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight whitespace-nowrap m-0">
            Welcome to
          </h2>
          <img 
            src="/Logo_primary-removebg.png" 
            alt="SchoolChakra"
            className="h-4 sm:h-5 md:h-6 w-auto object-contain shrink min-w-0 translate-y-[1px] sm:translate-y-[2px]"
          />
        </div>
        <p className="mt-3 text-center text-sm text-gray-500">
          Please sign in to your account
        </p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto relative z-10">
        {showGratitude && (
          <div className="mb-6 bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start text-blue-800 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm backdrop-blur-sm relative">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-600" />
            <div className="text-sm leading-relaxed pr-6">
              <span className="font-semibold block mb-1">Thank You for using SchoolChakra!</span>
              This application is currently in active development. If you encounter any bugs or issues, we highly encourage you to report them using the "Report an Issue" button in your dashboard navigation tab after logging in.
            </div>
            <button 
              onClick={() => setShowGratitude(false)}
              className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl py-8 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl sm:rounded-3xl sm:px-10 border border-gray-100/50">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700">ERP ID</label>
              <div className="mt-1.5">
                <input
                  type="text"
                  required
                  value={erpId}
                  onChange={(e) => setErpId(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all bg-white"
                  placeholder="e.g. STU001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <div className="mt-1.5">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-[0.98] disabled:opacity-70 shadow-blue-500/20 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign in
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/user-guide')}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-[0.98] cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mr-2 text-gray-500" />
                View User Guide
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
