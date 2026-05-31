import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 shadow-xl shadow-blue-500/10">
            <AlertTriangle className="w-12 h-12" />
          </div>
        </div>
        
        <h1 className="text-9xl font-extrabold text-blue-600/20 tracking-tighter absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 -z-10 select-none">
          404
        </h1>
        
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          Page Not Found
        </h2>
        <p className="mt-4 text-base text-gray-600">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/"
            className="flex items-center justify-center py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
