import React from 'react';
import useAuthStore from '../store/authStore';
import { User, Phone, Mail, BookOpen, Clock, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="px-8 pb-8 relative">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-8">
            <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
              <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600">
                {user.profilePicUrl ? (
                  <img src={user.profilePicUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 pb-8">
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-2" />
              Please contact the admin to update your profile details.
            </div>
          </div>

          {/* User Info */}
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-lg text-gray-500 font-medium capitalize mt-1">{user.role.replace('_', ' ')}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                  <div className="flex items-center text-gray-700">
                    <User className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ERP ID</p>
                      <p className="font-medium">{user.erpId}</p>
                    </div>
                  </div>
                  {user.schoolId && (
                    <div className="flex items-center text-gray-700">
                      <BookOpen className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">School ID</p>
                        <p className="font-medium">{user.schoolId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone / Contact</p>
                      <p className="font-medium">{user.contactDetails || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
