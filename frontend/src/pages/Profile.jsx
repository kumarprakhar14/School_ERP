import React from 'react';
import useAuthStore from '../store/authStore';
import { User, Phone, AlertCircle, School, Shield, Briefcase, BookOpen, Layers } from 'lucide-react';

export default function Profile() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex justify-center p-12">
        <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  const renderField = (label, value, icon = null) => (
    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      {icon && <div className="mr-3 text-gray-400">{icon}</div>}
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="font-medium text-gray-800">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="px-8 pb-8 relative">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-8">
            <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
              <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden">
                {user.profilePicUrl ? (
                  <img src={user.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:justify-end pt-20 sm:pt-4 pb-4 sm:pb-8">
            <div className="inline-flex items-center px-3 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs sm:text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Please contact your school administrator to update your profile details.</span>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-2 sm:mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-base sm:text-lg text-gray-500 font-medium capitalize mt-1">
              {user.role.replace('_', ' ')}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
                <div className="space-y-3">
                  {renderField('ERP ID', user.erpId, <User className="w-5 h-5" />)}
                  
                  {user.schoolName && (
                    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <School className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">School & Code</p>
                        <p className="font-medium text-gray-800">{user.schoolName} ({user.schoolCode || 'N/A'})</p>
                      </div>
                    </div>
                  )}

                  {renderField('Role', user.role.replace('_', ' '), <Shield className="w-5 h-5" />)}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact & Profile</h3>
                <div className="space-y-3">
                  {renderField('Phone / Contact', user.contactDetails, <Phone className="w-5 h-5" />)}
                  
                  {user.role === 'TEACHER' && (
                    <>
                      {renderField('Designation', user.teacherProfile?.designation || 'Teacher', <Briefcase className="w-5 h-5" />)}
                      
                      <div className="flex items-start text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <Layers className="w-5 h-5 mr-3 text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Assigned Sections</p>
                          <div className="font-medium">
                            {user.teacherProfile?.assignedSections?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.teacherProfile.assignedSections.map(s => (
                                  <span key={s.id} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
                                    {s.class?.name}-{s.name}
                                  </span>
                                ))}
                              </div>
                            ) : 'None'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {user.role === 'STUDENT' && (
                    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <BookOpen className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Class & Section</p>
                        <p className="font-medium text-gray-800">
                          {user.studentProfile?.section ? 
                            `${user.studentProfile.section.class?.name || 'Unknown'} - ${user.studentProfile.section.name}` : 
                            'Not assigned'}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
