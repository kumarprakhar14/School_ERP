import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(erpId, password, schoolId);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to EduCore
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {showGratitude && (
          <div className="mb-6 bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start text-blue-800 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm backdrop-blur-sm relative">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-600" />
            <div className="text-sm leading-relaxed pr-6">
              <span className="font-semibold block mb-1">Thank You for using EduCore!</span>
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

        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-3xl sm:px-10 border border-gray-100/50">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">ERP ID</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={erpId}
                  onChange={(e) => setErpId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="e.g. STU001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
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
                className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
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
