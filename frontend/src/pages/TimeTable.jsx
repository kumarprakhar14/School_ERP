import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Calendar, Plus, Clock, BookOpen, User, X } from 'lucide-react';

export default function TimeTable() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showEditPeriodModal, setShowEditPeriodModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    classId: '', sectionId: '', subjectId: '', teacherId: '', periodId: '', dayOfWeek: 'MONDAY'
  });
  const [subjectData, setSubjectData] = useState({ name: '', code: '' });
  const [periodData, setPeriodData] = useState({ name: '', startTime: '', endTime: '' });

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (user?.role === 'STUDENT' || user?.role === 'TEACHER') {
      fetchTimetable();
    } else if (selectedClassId) {
      fetchTimetable(selectedClassId, selectedSectionId);
    } else {
      setTimetable([]);
    }
  }, [selectedClassId, selectedSectionId, user?.role]);

  const fetchInitialData = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const [clsRes, subRes, perRes, teaRes] = await Promise.all([
          api.get('/classes'),
          api.get('/timetable/subjects'),
          api.get('/timetable/periods'),
          api.get('/users?role=TEACHER')
        ]);
        setClasses(clsRes.data);
        setSubjects(subRes.data);
        setPeriods(perRes.data);
        setTeachers(teaRes.data);
      } else {
        const [perRes] = await Promise.all([api.get('/timetable/periods')]);
        setPeriods(perRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch initial data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (classId = '', sectionId = '') => {
    try {
      const queryParams = new URLSearchParams();
      if (classId) queryParams.append('classId', classId);
      if (sectionId) queryParams.append('sectionId', sectionId);
      const res = await api.get(`/timetable?${queryParams.toString()}`);
      setTimetable(res.data);
    } catch (error) {
      console.error('Failed to fetch timetable', error);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable', formData);
      setShowAddModal(false);
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to add timetable entry');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable/subjects', subjectData);
      setShowSubjectModal(false);
      setSubjectData({ name: '', code: '' });
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable/periods', periodData);
      setShowPeriodModal(false);
      setPeriodData({ name: '', startTime: '', endTime: '' });
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create period');
    }
  };

  const handleEditPeriod = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/timetable/periods/${showEditPeriodModal.id}`, periodData);
      setShowEditPeriodModal(null);
      setPeriodData({ name: '', startTime: '', endTime: '' });
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update period');
    }
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/timetable/${itemToDelete}`);
      toast.success('Entry deleted successfully');
      fetchTimetable(selectedClassId, selectedSectionId);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete entry');
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const getEntry = (day, periodId) => {
    return timetable.find(t => t.dayOfWeek === day && t.periodId === periodId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-indigo-200/50">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time Table</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and view class schedules</p>
          </div>
        </div>
        
        {user?.role === 'ADMIN' && (
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowSubjectModal(true)} className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium text-sm">
              <Plus className="w-4 h-4 mr-2" /> Subject
            </button>
            <button onClick={() => setShowPeriodModal(true)} className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium text-sm">
              <Plus className="w-4 h-4 mr-2" /> Period
            </button>
            {selectedClassId && selectedSectionId && (
              <button 
                onClick={() => {
                  setFormData({ ...formData, classId: selectedClassId, sectionId: selectedSectionId });
                  setShowAddModal(true);
                }}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Entry
              </button>
            )}
          </div>
        )}
      </div>

      {user?.role === 'ADMIN' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); }} className="border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48">
            <option value="">Select Class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} disabled={!selectedClassId} className="border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48">
            <option value="">Select Section...</option>
            {selectedClassId && classes.find(c => c.id === selectedClassId)?.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span></div>
      ) : (
        (!selectedClassId && user?.role === 'ADMIN') ? (
          <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
            Please select a class to view or manage the timetable.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-500 text-sm w-32 border-r border-gray-100 text-center">Time \ Day</th>
                  {days.map(day => (
                    <th key={day} className="p-4 font-semibold text-gray-700 text-sm text-center border-r border-gray-100 last:border-0">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periods.map(period => (
                  <tr key={period.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-4 border-r border-gray-100 text-center relative group/period">
                      <div className="font-semibold text-gray-800 text-sm">{period.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{period.startTime} - {period.endTime}</div>
                      {user?.role === 'ADMIN' && (
                        <button 
                          onClick={() => { setPeriodData({ name: period.name, startTime: period.startTime, endTime: period.endTime }); setShowEditPeriodModal(period); }}
                          className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/period:opacity-100 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                    {days.map(day => {
                      const entry = getEntry(day, period.id);
                      return (
                        <td key={`${period.id}-${day}`} className="p-2 border-r border-gray-100 last:border-0 align-top">
                          {entry ? (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3 rounded-xl border border-blue-100/50 h-full relative group">
                              <div className="font-semibold text-blue-900 text-sm mb-1">{entry.subject.name}</div>
                              {user?.role !== 'TEACHER' && (
                                <div className="text-xs text-gray-600 flex items-center mb-1"><User className="w-3 h-3 mr-1" />{entry.teacher.user.name}</div>
                              )}
                              {user?.role !== 'STUDENT' && (
                                <div className="text-xs text-gray-600 flex items-center"><BookOpen className="w-3 h-3 mr-1" />{entry.class?.name}{entry.section ? ` - ${entry.section.name}` : ''}</div>
                              )}
                              {user?.role === 'ADMIN' && (
                                <button onClick={() => handleDeleteClick(entry.id)} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[80px] rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs bg-gray-50/30">
                              Free
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">No time table found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ADD ENTRY MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add TimeTable Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select required value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select required value={formData.periodId} onChange={e => setFormData({...formData, periodId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Period...</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.startTime}-{p.endTime})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                <select required value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.teacherProfile.id}>{t.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Add Entry</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADD SUBJECT MODAL */}
      {showSubjectModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Subject</h2>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSubject} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input required type="text" value={subjectData.name} onChange={e => setSubjectData({...subjectData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code (Optional)</label>
                <input type="text" value={subjectData.code} onChange={e => setSubjectData({...subjectData, code: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. MAT101" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Create Subject</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADD PERIOD MODAL */}
      {showPeriodModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Period</h2>
              <button onClick={() => setShowPeriodModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreatePeriod} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Name</label>
                <input required type="text" value={periodData.name} onChange={e => setPeriodData({...periodData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Period 1, Lunch Break" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input required type="time" value={periodData.startTime} onChange={e => setPeriodData({...periodData, startTime: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input required type="time" value={periodData.endTime} onChange={e => setPeriodData({...periodData, endTime: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Create Period</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT PERIOD MODAL */}
      {showEditPeriodModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Edit Period</h2>
              <button onClick={() => setShowEditPeriodModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditPeriod} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Name</label>
                <input required type="text" value={periodData.name} onChange={e => setPeriodData({...periodData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input required type="time" value={periodData.startTime} onChange={e => setPeriodData({...periodData, startTime: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input required type="time" value={periodData.endTime} onChange={e => setPeriodData({...periodData, endTime: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Save Changes</button>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Entry"
        message="Are you sure you want to delete this timetable entry?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
}
