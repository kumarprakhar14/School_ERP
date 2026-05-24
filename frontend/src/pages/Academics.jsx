import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { BookOpen, Plus, Users, ChevronRight, X } from 'lucide-react';

export default function Academics() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(null); // stores classId
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/classes', { name: className });
      setClassName('');
      setShowClassModal(false);
      fetchClasses();
    } catch (error) {
      console.error(error);
      alert('Failed to create class');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/classes/${showSectionModal}/sections`, { name: sectionName });
      setSectionName('');
      setShowSectionModal(null);
      fetchClasses();
    } catch (error) {
      console.error(error);
      alert('Failed to create section');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-blue-200/50">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage classes, sections, and subjects</p>
          </div>
        </div>
        
        {user?.role === 'ADMIN' && (
          <button 
            onClick={() => setShowClassModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden group hover:shadow-lg transition-all">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Class {cls.name}</h3>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                  {cls.sections?.length || 0} Sections
                </span>
              </div>
              
              <div className="p-5 space-y-3">
                {cls.sections?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No sections added yet.</p>
                ) : (
                  cls.sections?.map(sec => (
                    <div key={sec.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm mr-3">
                          {sec.name}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Section {sec.name}</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-xs font-medium">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        {sec.students?.length || 0}
                      </div>
                    </div>
                  ))
                )}
                
                {user?.role === 'ADMIN' && (
                  <button 
                    onClick={() => setShowSectionModal(cls.id)}
                    className="w-full mt-2 py-2 flex items-center justify-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100/50"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Section
                  </button>
                )}
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
              No classes found. {user?.role === 'ADMIN' && 'Click "Add Class" to get started.'}
            </div>
          )}
        </div>
      )}

      {/* ADD CLASS MODAL */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Add New Class</h2>
              <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateClass} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input required type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 10, 11, XII" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Create Class</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD SECTION MODAL */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Add Section</h2>
              <button onClick={() => setShowSectionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSection} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                <input required type="text" value={sectionName} onChange={e => setSectionName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. A, B, Science" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Create Section</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
