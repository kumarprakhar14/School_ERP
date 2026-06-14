import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Calendar, Plus, Clock, BookOpen, User, X, Check, Trash2, Edit3, Users, GraduationCap } from 'lucide-react';

export default function TimeTable() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'class' or 'teacher' (admin only)
  const [viewMode, setViewMode] = useState('class');

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Inline cell editor state
  const [editingCell, setEditingCell] = useState(null); // { day, periodId, entry? }
  const [cellFormData, setCellFormData] = useState({ subjectId: '', teacherId: '' });
  const [cellSaving, setCellSaving] = useState(false);
  const popoverRef = useRef(null);

  // Modals (Subject & Period management only)
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showEditPeriodModal, setShowEditPeriodModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [subjectData, setSubjectData] = useState({ name: '', code: '' });
  const [periodData, setPeriodData] = useState({ name: '', startTime: '', endTime: '' });

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayLabels = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat' };

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setEditingCell(null);
      }
    };
    if (editingCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCell]);

  // Close popover on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setEditingCell(null);
    };
    if (editingCell) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [editingCell]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch timetable based on view mode and filters
  useEffect(() => {
    if (user?.role === 'STUDENT' || user?.role === 'TEACHER') {
      fetchTimetable();
    } else if (viewMode === 'class' && selectedClassId) {
      fetchTimetable({ classId: selectedClassId, sectionId: selectedSectionId });
    } else if (viewMode === 'teacher' && selectedTeacherId) {
      fetchTimetable({ teacherId: selectedTeacherId });
    } else {
      setTimetable([]);
    }
  }, [selectedClassId, selectedSectionId, selectedTeacherId, viewMode, user?.role]);

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

  const fetchTimetable = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.classId) queryParams.append('classId', params.classId);
      if (params.sectionId) queryParams.append('sectionId', params.sectionId);
      if (params.teacherId) queryParams.append('teacherId', params.teacherId);
      const res = await api.get(`/timetable?${queryParams.toString()}`);
      setTimetable(res.data);
    } catch (error) {
      console.error('Failed to fetch timetable', error);
    }
  };

  // --- Inline cell editing handlers (class view only) ---

  const handleCellClick = (day, periodId, entry) => {
    if (user?.role !== 'ADMIN') return;
    if (viewMode !== 'class') return; // No inline editing in teacher view
    if (!selectedClassId || !selectedSectionId) return;

    setEditingCell({ day, periodId, entry: entry || null });
    setCellFormData({
      subjectId: entry?.subjectId || '',
      teacherId: entry?.teacherId || ''
    });
  };

  const handleCellSave = async () => {
    if (!editingCell || !cellFormData.subjectId || !cellFormData.teacherId) return;
    setCellSaving(true);
    try {
      // If editing an existing entry, delete it first, then create a new one
      if (editingCell.entry) {
        await api.delete(`/timetable/${editingCell.entry.id}`);
      }
      await api.post('/timetable', {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: cellFormData.subjectId,
        teacherId: cellFormData.teacherId,
        periodId: editingCell.periodId,
        dayOfWeek: editingCell.day
      });
      toast.success(editingCell.entry ? 'Entry updated' : 'Entry added');
      setEditingCell(null);
      fetchTimetable({ classId: selectedClassId, sectionId: selectedSectionId });
    } catch (error) {
      console.error(error);
      // Provide context-aware messages for conflict errors (unique constraint violations)
      if (error.response?.status === 409) {
        const dayFormatted = editingCell.day.charAt(0) + editingCell.day.slice(1).toLowerCase();
        const teacherName = teachers.find(t => t.teacherProfile?.id === cellFormData.teacherId)?.name || 'This teacher';
        const periodName = periods.find(p => p.id === editingCell.periodId)?.name || 'this period';
        
        const serverMsg = error.response?.data?.message || '';
        if (serverMsg.toLowerCase().includes('teacher')) {
          toast.error(`${teacherName} is already assigned to another class during ${periodName} on ${dayFormatted}.`);
        } else {
          toast.error(`This slot already has an entry for ${periodName} on ${dayFormatted}. Remove it first.`);
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to save entry');
      }
    } finally {
      setCellSaving(false);
    }
  };

  const handleCellDelete = () => {
    if (!editingCell?.entry) return;
    setDeleteTarget(editingCell.entry.id);
    setShowDeleteConfirm(true);
    setEditingCell(null);
  };

  // --- Subject/Period management ---

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/timetable/${deleteTarget}`);
      toast.success('Entry deleted successfully');
      if (viewMode === 'class') {
        fetchTimetable({ classId: selectedClassId, sectionId: selectedSectionId });
      } else {
        fetchTimetable({ teacherId: selectedTeacherId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete entry');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const getEntry = (day, periodId) => {
    return timetable.find(t => t.dayOfWeek === day && t.periodId === periodId);
  };

  // For teacher view: a teacher can have multiple entries in the same period+day (if data is bad),
  // but normally it's one. We use find for consistency.
  const getTeacherEntry = (day, periodId) => {
    return timetable.find(t => t.dayOfWeek === day && t.periodId === periodId);
  };

  const isCellEditing = (day, periodId) => {
    return editingCell?.day === day && editingCell?.periodId === periodId;
  };

  const isAdmin = user?.role === 'ADMIN';
  const canEdit = isAdmin && viewMode === 'class' && selectedClassId && selectedSectionId;

  // Switch view mode and reset filters
  const switchViewMode = (mode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setEditingCell(null);
    setTimetable([]);
    // Don't reset filters — just let the useEffect handle the fetch
  };

  // Determine if a selection has been made for the active view
  const hasSelection = viewMode === 'class' ? !!selectedClassId : !!selectedTeacherId;

  // Get the selected teacher's name for the header
  const selectedTeacherName = selectedTeacherId
    ? teachers.find(t => t.teacherProfile?.id === selectedTeacherId)?.name
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-indigo-200/50">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Time Table</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {canEdit ? 'Click any cell to edit directly' : 'Manage and view class schedules'}
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowSubjectModal(true)} className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium text-sm">
              <Plus className="w-4 h-4 mr-2" /> Subject
            </button>
            <button onClick={() => setShowPeriodModal(true)} className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium text-sm">
              <Plus className="w-4 h-4 mr-2" /> Period
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle + Filters */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => switchViewMode('class')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'class'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Class View
            </button>
            <button
              onClick={() => switchViewMode('teacher')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'teacher'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Teacher View
            </button>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {viewMode === 'class' ? (
              <>
                <select
                  value={selectedClassId}
                  onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); setEditingCell(null); }}
                  className="border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
                >
                  <option value="">Select Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={selectedSectionId}
                  onChange={e => { setSelectedSectionId(e.target.value); setEditingCell(null); }}
                  disabled={!selectedClassId}
                  className="border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
                >
                  <option value="">Select Section...</option>
                  {selectedClassId && classes.find(c => c.id === selectedClassId)?.sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {canEdit && (
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 ml-auto">
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Click any cell to edit
                  </div>
                )}
              </>
            ) : (
              <>
                <select
                  value={selectedTeacherId}
                  onChange={e => { setSelectedTeacherId(e.target.value); setEditingCell(null); }}
                  className="border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                >
                  <option value="">Select Teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.teacherProfile?.id}>{t.name}</option>)}
                </select>
                {selectedTeacherName && (
                  <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 ml-auto">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    {selectedTeacherName}'s schedule
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="flex justify-center p-12"><span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span></div>
      ) : (
        (!hasSelection && isAdmin) ? (
          <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
            {viewMode === 'class'
              ? 'Please select a class to view or manage the timetable.'
              : 'Please select a teacher to view their schedule.'
            }
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
              <colgroup>
                <col className="w-28" />
                {days.map(day => <col key={day} />)}
              </colgroup>
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-500 text-sm border-r border-gray-100 text-center sticky left-0 z-10 bg-gray-50">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Period
                    </div>
                  </th>
                  {days.map(day => (
                    <th key={day} className="p-4 font-semibold text-gray-700 text-sm text-center border-r border-gray-100 last:border-0">
                      <div className="text-xs text-gray-400 uppercase tracking-wider">{dayLabels[day]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periods.map(period => (
                  <tr key={period.id} className="group/row">
                    {/* Period label cell */}
                    <td className="p-4 border-r border-gray-100 text-center relative group/period bg-white sticky left-0 z-10">
                      <div className="font-semibold text-gray-800 text-sm">{period.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{period.startTime} - {period.endTime}</div>
                      {isAdmin && (
                        <button 
                          onClick={() => { setPeriodData({ name: period.name, startTime: period.startTime, endTime: period.endTime }); setShowEditPeriodModal(period); }}
                          className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/period:opacity-100 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>

                    {/* Day cells */}
                    {days.map(day => {
                      const entry = getEntry(day, period.id);
                      const isEditing = isCellEditing(day, period.id);

                      if (viewMode === 'teacher') {
                        // --- TEACHER VIEW CELL ---
                        return (
                          <td key={`${period.id}-${day}`} className="p-1.5 border-r border-gray-100 last:border-0 align-top">
                            {entry ? (
                              <div className="bg-gradient-to-br from-purple-50 to-violet-50/50 p-2.5 rounded-xl border border-purple-100/50 h-full min-h-[80px] overflow-hidden">
                                <div className="font-semibold text-purple-900 text-sm mb-1 truncate">
                                  {entry.class?.name}{entry.section ? ` - ${entry.section.name}` : ''}
                                </div>
                                <div className="text-xs text-gray-600 flex items-center truncate">
                                  <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{entry.subject.name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[80px] rounded-xl border border-dashed border-gray-200 bg-gray-50/30 flex items-center justify-center text-gray-400 text-xs">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      }

                      // --- CLASS VIEW CELL ---
                      return (
                        <td key={`${period.id}-${day}`} className="p-1.5 border-r border-gray-100 last:border-0 align-top relative">
                          {entry ? (
                            /* Filled cell */
                            <div
                              onClick={() => handleCellClick(day, period.id, entry)}
                              className={`
                                bg-gradient-to-br from-blue-50 to-indigo-50/50 p-2.5 rounded-xl border h-full min-h-[80px] overflow-hidden
                                transition-all duration-150
                                ${canEdit
                                  ? 'cursor-pointer border-blue-100/50 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/50 hover:from-blue-100/80 hover:to-indigo-100/60 active:scale-[0.98]'
                                  : 'border-blue-100/50'
                                }
                                ${isEditing ? 'ring-2 ring-blue-400 border-blue-300 shadow-md shadow-blue-100/50' : ''}
                              `}
                            >
                              <div className="font-semibold text-blue-900 text-sm mb-1 truncate">{entry.subject.name}</div>
                              {user?.role !== 'TEACHER' && (
                                <div className="text-xs text-gray-600 flex items-center mb-0.5 truncate"><User className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">{entry.teacher.user.name}</span></div>
                              )}
                              {user?.role !== 'STUDENT' && (
                                <div className="text-xs text-gray-600 flex items-center truncate"><BookOpen className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">{entry.class?.name}{entry.section ? ` - ${entry.section.name}` : ''}</span></div>
                              )}
                            </div>
                          ) : (
                            /* Empty cell */
                            <div
                              onClick={() => handleCellClick(day, period.id, null)}
                              className={`
                                h-full min-h-[80px] rounded-xl border border-dashed flex items-center justify-center
                                transition-all duration-150
                                ${canEdit
                                  ? 'cursor-pointer border-gray-200 bg-gray-50/30 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm group/cell active:scale-[0.98]'
                                  : 'border-gray-200 bg-gray-50/30 text-gray-400 text-xs'
                                }
                                ${isEditing ? 'ring-2 ring-blue-400 border-blue-300 bg-blue-50/40 shadow-sm' : ''}
                              `}
                            >
                              {canEdit ? (
                                <div className="flex flex-col items-center gap-1 text-gray-400 group-hover/cell:text-blue-500 transition-colors">
                                  <Plus className="w-5 h-5" />
                                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover/cell:opacity-100 transition-opacity">Add</span>
                                </div>
                              ) : (
                                <span>Free</span>
                              )}
                            </div>
                          )}

                          {/* Inline popover editor */}
                          {isEditing && (
                            <div
                              ref={popoverRef}
                              className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                              style={{ minWidth: '240px' }}
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Popover header */}
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  {dayLabels[day]} · {period.name}
                                </span>
                                <button onClick={() => setEditingCell(null)} className="p-0.5 text-gray-400 hover:text-gray-600 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Popover body */}
                              <div className="p-3 space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                                  <select
                                    value={cellFormData.subjectId}
                                    onChange={e => setCellFormData({ ...cellFormData, subjectId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none bg-white"
                                    autoFocus
                                  >
                                    <option value="">Select Subject...</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
                                  <select
                                    value={cellFormData.teacherId}
                                    onChange={e => setCellFormData({ ...cellFormData, teacherId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none bg-white"
                                  >
                                    <option value="">Select Teacher...</option>
                                    {teachers.map(t => <option key={t.id} value={t.teacherProfile.id}>{t.name}</option>)}
                                  </select>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={handleCellSave}
                                    disabled={!cellFormData.subjectId || !cellFormData.teacherId || cellSaving}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {cellSaving ? (
                                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    {editingCell.entry ? 'Update' : 'Save'}
                                  </button>
                                  {editingCell.entry && (
                                    <button
                                      onClick={handleCellDelete}
                                      className="flex items-center justify-center p-2 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-lg transition-all"
                                      title="Delete entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
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
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
