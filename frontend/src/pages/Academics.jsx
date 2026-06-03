import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { BookOpen, Plus, Users, ChevronRight, X, Trash2 } from 'lucide-react';

export default function Academics() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(null); // stores classId
  const [showEditClassModal, setShowEditClassModal] = useState(null); // stores class
  const [showEditSectionModal, setShowEditSectionModal] = useState(null); // stores section
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      fetchStudentData();
    } else {
      fetchClasses();
    }
  }, [user]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/timetable');
      setTimetable(res.data);
    } catch (error) {
      console.error('Failed to fetch student timetable', error);
    } finally {
      setLoading(false);
    }
  };

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
      toast.success('Class created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create class');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/classes/${showSectionModal}/sections`, { name: sectionName });
      setSectionName('');
      setShowSectionModal(null);
      fetchClasses();
      toast.success('Section created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create section');
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/classes/${showEditClassModal.id}`, { name: className });
      setClassName('');
      setShowEditClassModal(null);
      fetchClasses();
      toast.success('Class updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update class');
    }
  };

  const handleEditSection = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/classes/sections/${showEditSectionModal.id}`, { name: sectionName });
      setSectionName('');
      setShowEditSectionModal(null);
      fetchClasses();
      toast.success('Section updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update section');
    }
  };

  const handleDeleteClick = (sectionId) => {
    setDeleteTarget(sectionId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/classes/sections/${deleteTarget}`);
      toast.success('Section deleted successfully');
      fetchClasses();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete section');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
      ) : user?.role === 'STUDENT' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(() => {
            if (timetable.length === 0) {
              return (
                <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                  No subjects or timetable assigned yet.
                </div>
              );
            }
            
            // Extract unique subjects and their assigned teachers
            const subjectMap = new Map();
            timetable.forEach(entry => {
              if (!subjectMap.has(entry.subject.id)) {
                subjectMap.set(entry.subject.id, {
                  name: entry.subject.name,
                  teachers: new Set()
                });
              }
              subjectMap.get(entry.subject.id).teachers.add(entry.teacher.user.name);
            });

            return Array.from(subjectMap.entries()).map(([id, subject]) => (
              <div key={id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{subject.name}</h3>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-start space-x-2">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Assigned Teachers</p>
                    <p className="text-sm font-medium text-gray-700">{Array.from(subject.teachers).join(', ')}</p>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.filter(cls => {
            if (user?.role === 'TEACHER') {
              return cls.sections?.some(sec => sec.teacherAssignments?.some(ta => ta.teacher?.user?.id === user?.id));
            }
            return true;
          }).map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden group hover:shadow-lg transition-all">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-gray-900">Class {cls.name}</h3>
                  {user?.role === 'ADMIN' && (
                    <button onClick={() => { setClassName(cls.name); setShowEditClassModal(cls); }} className="text-blue-500 hover:text-blue-700 text-xs font-medium ml-2">Edit</button>
                  )}
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                  {cls.sections?.length || 0} Sections
                </span>
              </div>
              
              <div className="p-5 space-y-3">
                {cls.sections?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No sections added yet.</p>
                ) : (
                  cls.sections?.filter(sec => {
                    if (user?.role === 'TEACHER') {
                      return sec.teacherAssignments?.some(ta => ta.teacher?.user?.id === user?.id);
                    }
                    return true;
                  }).map(sec => (
                    <div key={sec.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm mr-3">
                          {sec.name}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Section {sec.name}</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-xs font-medium space-x-3">
                        <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" />{sec._count?.students || 0}</span>
                        {user?.role === 'ADMIN' && (
                          <div className="flex items-center space-x-1">
                            <button onClick={() => { setSectionName(sec.name); setShowEditSectionModal(sec); }} className="p-1 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Section">
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteClick(sec.id)} className="p-1 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Section">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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
      {/* EDIT CLASS MODAL */}
      {showEditClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Class</h2>
              <button onClick={() => setShowEditClassModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditClass} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input required type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SECTION MODAL */}
      {showEditSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Section</h2>
              <button onClick={() => setShowEditSectionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditSection} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                <input required type="text" value={sectionName} onChange={e => setSectionName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Section"
        message="Are you sure you want to delete this section? This will remove all students and timetable associated with it. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
