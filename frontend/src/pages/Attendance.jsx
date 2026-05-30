import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { Calendar, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function Attendance() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [teacherTimetable, setTeacherTimetable] = useState([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchClasses();
    } else if (user?.role === 'TEACHER') {
      fetchClasses(); // To get student data
      fetchTimetable();
    } else if (user?.role === 'STUDENT') {
      fetchMyAttendance();
    }
  }, [user]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isLocked && !isSaved) {
        e.preventDefault();
        e.returnValue = 'You have unsaved or unlocked attendance. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isLocked, isSaved]);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/timetable');
      setTeacherTimetable(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyAttendance = async () => {
    // For student view
  };

  const handleFetchStudents = async () => {
    if (!selectedSectionId) return;
    setLoading(true);
    try {
      // Fetch students for this section (we can do this by getting the specific class -> section details)
      const cls = classes.find(c => c.id === selectedClassId);
      const sec = cls?.sections.find(s => s.id === selectedSectionId);
      if (sec) {
        setStudents(sec.students || []);
        
        // Also fetch existing attendance for this date
        const attRes = await api.get(`/attendance?sectionId=${selectedSectionId}&date=${date}`);
        const existingMap = {};
        let locked = false;
        let saved = false;

        attRes.data.forEach(r => {
          existingMap[r.studentId] = r.status;
          if (r.isLocked) locked = true;
          if (r.isSaved) saved = true;
        });
        
        setIsLocked(locked);
        setIsSaved(saved);
        setHasUnsavedChanges(false);

        // Pre-fill records: if existing, use it; else default to PRESENT
        const initialRecords = {};
        sec.students.forEach(s => {
          initialRecords[s.userId] = existingMap[s.userId] || 'PRESENT';
        });
        setAttendanceRecords(initialRecords);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.keys(attendanceRecords).map(studentId => ({
        studentId,
        status: attendanceRecords[studentId]
      }));
      
      await api.post('/attendance', {
        sectionId: selectedSectionId,
        date,
        records
      });
      setHasUnsavedChanges(true); // Still needs locking
      alert('Attendance saved temporarily! Remember to lock it.');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleStateUpdate = async (endpoint, successMsg) => {
    try {
      await api.put(`/attendance/${endpoint}`, { sectionId: selectedSectionId, date });
      alert(successMsg);
      handleFetchStudents(); // refresh
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${endpoint} attendance`);
    }
  };

  const markAll = (status) => {
    if (isLocked || isSaved) return;
    const newRecords = { ...attendanceRecords };
    Object.keys(newRecords).forEach(k => newRecords[k] = status);
    setAttendanceRecords(newRecords);
    setHasUnsavedChanges(true);
  };

  const updateRecord = (studentId, status) => {
    if (isLocked || isSaved) return;
    setAttendanceRecords({...attendanceRecords, [studentId]: status});
    setHasUnsavedChanges(true);
  };

  if (user?.role === 'STUDENT') {
    return (
      <div className="p-6 text-center text-gray-500">
        Student Attendance View Coming Soon
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-emerald-200/50">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mark and view student attendance</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
        {user?.role === 'ADMIN' ? (
          <>
            <div className="w-full sm:flex-1 sm:min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select 
                value={selectedClassId} 
                onChange={e => { setSelectedClassId(e.target.value); setSelectedSectionId(''); }}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="w-full sm:flex-1 sm:min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select 
                value={selectedSectionId} 
                onChange={e => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {classes.find(c => c.id === selectedClassId)?.sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : user?.role === 'TEACHER' ? (
          <div className="w-full sm:flex-1 sm:min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Classes</label>
            <select 
              value={selectedSectionId} 
              onChange={e => {
                const sectionId = e.target.value;
                setSelectedSectionId(sectionId);
                // Auto set selectedClassId so handleFetchStudents works
                const cls = classes.find(c => c.sections.some(s => s.id === sectionId));
                if (cls) setSelectedClassId(cls.id);
              }}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="">Select Assigned Section...</option>
              {(() => {
                // Fix timezone by adding T00:00:00 to avoid UTC midnight shifting day backwards
                const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(date + 'T00:00:00').getDay()];
                const todaysEntries = teacherTimetable.filter(t => t.dayOfWeek === dayName);
                
                const optionsMap = new Map();
                
                // Add directly assigned sections (Class Teacher)
                classes.forEach(c => {
                  c.sections.forEach(s => {
                    if (s.teachers && s.teachers.some(t => t.user?.id === user.id)) {
                      optionsMap.set(s.id, `${c.name} - Section ${s.name} (Class Teacher)`);
                    }
                  });
                });
                
                // Add sections from today's timetable
                todaysEntries.forEach(entry => {
                  if (!optionsMap.has(entry.sectionId)) {
                    optionsMap.set(entry.sectionId, `${entry.section.class.name} - Section ${entry.section.name} (${entry.subject.name})`);
                  }
                });
                
                return Array.from(optionsMap.entries()).map(([secId, label]) => (
                  <option key={secId} value={secId}>{label}</option>
                ));
              })()}
            </select>
          </div>
        ) : null}

        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input 
            type="date" 
            max={new Date().toISOString().split('T')[0]}
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          />
        </div>

        <button 
          onClick={handleFetchStudents}
          disabled={!selectedSectionId || loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? 'Loading...' : <><Search className="w-4 h-4 mr-2"/> Fetch List</>}
        </button>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4">
            <h3 className="font-bold text-gray-800">
              Students ({students.length})
              {isSaved && <span className="ml-3 text-xs font-bold text-white bg-blue-500 px-2 py-1 rounded">FINAL SAVED</span>}
              {isLocked && !isSaved && <span className="ml-3 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded border border-amber-200">LOCKED</span>}
            </h3>
            <div className="space-x-2">
              <button disabled={isLocked || isSaved} onClick={() => markAll('PRESENT')} className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50">Mark All Present</button>
              <button disabled={isLocked || isSaved} onClick={() => markAll('ABSENT')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">Mark All Absent</button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-50">
            {students.map(s => (
              <div key={s.userId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/30 transition-colors gap-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center font-bold text-gray-600 mr-4">
                    {s.user?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{s.user?.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{s.user?.erpId}</p>
                  </div>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => updateRecord(s.userId, 'PRESENT')}
                    disabled={isLocked || isSaved}
                    className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      attendanceRecords[s.userId] === 'PRESENT' 
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    } disabled:opacity-60`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Present
                  </button>
                  <button 
                    onClick={() => updateRecord(s.userId, 'ABSENT')}
                    disabled={isLocked || isSaved}
                    className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      attendanceRecords[s.userId] === 'ABSENT' 
                        ? 'bg-white text-red-600 shadow-sm border border-red-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    } disabled:opacity-60`}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Absent
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
            {!isLocked && !isSaved && (
              <button 
                onClick={handleSave}
                disabled={saving || isLocked || isSaved}
                className="px-6 py-2.5 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-70 shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Temp'}
              </button>
            )}
            {!isLocked && !isSaved && (
              <button 
                onClick={() => handleStateUpdate('lock', 'Attendance Locked!')}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors shadow-sm shadow-amber-600/20"
              >
                Lock Attendance
              </button>
            )}
            {isLocked && !isSaved && (
              <>
                <button 
                  onClick={() => handleStateUpdate('unlock', 'Attendance Unlocked!')}
                  className="px-6 py-2.5 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors shadow-sm"
                >
                  Unlock
                </button>
                <button 
                  onClick={() => handleStateUpdate('save', 'Attendance Finalized!')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
                >
                  Final Save
                </button>
              </>
            )}
            {isSaved && (
              <button disabled className="px-6 py-2.5 bg-gray-400 text-white rounded-xl font-medium cursor-not-allowed">
                Permanently Saved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
