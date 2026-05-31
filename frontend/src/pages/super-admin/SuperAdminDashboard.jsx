import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Building2, Calendar, Users, MoreVertical, X } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all tenant schools and their subscriptions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map(school => (
            <div key={school.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50 group-hover:opacity-100 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center border border-blue-100/50 shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1">{school.name} <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">Code: {school.code}</span></h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-1">{school.settings?.description || 'No description provided.'}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-5 bg-gray-50/80 p-2.5 rounded-lg">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="font-medium text-gray-700">Valid till: {new Date(school.validUntil).toLocaleDateString()}</span>
                </div>

                <div className="pt-4 border-t border-gray-100/80 flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600 font-medium">
                    <Users className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span>{school._count?.users || 0} Users</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                    new Date(school.validUntil) > new Date() 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {new Date(school.validUntil) > new Date() ? 'Active' : 'Expired'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
