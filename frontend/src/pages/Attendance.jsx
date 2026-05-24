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

  useEffect(() => {
    if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
      fetchClasses();
    } else if (user?.role === 'STUDENT') {
      fetchMyAttendance();
    }
  }, [user]);

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
        attRes.data.forEach(r => {
          existingMap[r.studentId] = r.status;
        });
        
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
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    const newRecords = { ...attendanceRecords };
    Object.keys(newRecords).forEach(k => newRecords[k] = status);
    setAttendanceRecords(newRecords);
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

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
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
        
        <div className="flex-1 min-w-[200px]">
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

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          />
        </div>

        <button 
          onClick={handleFetchStudents}
          disabled={!selectedSectionId || loading}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
        >
          {loading ? 'Loading...' : <><Search className="w-4 h-4 mr-2"/> Fetch List</>}
        </button>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Students ({students.length})</h3>
            <div className="space-x-2">
              <button onClick={() => markAll('PRESENT')} className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">Mark All Present</button>
              <button onClick={() => markAll('ABSENT')} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">Mark All Absent</button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-50">
            {students.map(s => (
              <div key={s.userId} className="p-4 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
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
                    onClick={() => setAttendanceRecords({...attendanceRecords, [s.userId]: 'PRESENT'})}
                    className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      attendanceRecords[s.userId] === 'PRESENT' 
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Present
                  </button>
                  <button 
                    onClick={() => setAttendanceRecords({...attendanceRecords, [s.userId]: 'ABSENT'})}
                    className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      attendanceRecords[s.userId] === 'ABSENT' 
                        ? 'bg-white text-red-600 shadow-sm border border-red-100' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Absent
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-sm shadow-emerald-600/20"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
