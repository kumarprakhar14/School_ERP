import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { Bell, Send, User, Clock, CheckCircle, Plus, Users, BookOpen, Calendar, FileText } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Notice State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [noticeRes, statsRes] = await Promise.all([
        api.get('/notices'),
        api.get('/dashboard/stats').catch(() => ({ data: null }))
      ]);
      setNotices(noticeRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const targetRoles = targetRole ? [targetRole] : [];
      await api.post('/notices', { title, content, targetRoles });
      setTitle('');
      setContent('');
      setTargetRole('');
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert('Failed to post notice');
    } finally {
      setPosting(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderQuickStats = () => {
    if (!stats) return null;

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">School Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 text-center hover:bg-blue-50 transition-colors">
              <div className="text-2xl font-black text-blue-600">{stats.studentCount || 0}</div>
              <div className="text-[11px] uppercase tracking-wider text-blue-800 font-bold mt-1">Students</div>
            </div>
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 text-center hover:bg-emerald-50 transition-colors">
              <div className="text-2xl font-black text-emerald-600">{stats.teacherCount || 0}</div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold mt-1">Teachers</div>
            </div>
            <div className="col-span-1 sm:col-span-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/50 flex justify-between items-center hover:bg-indigo-50 transition-colors">
              <span className="text-xs uppercase tracking-wider text-indigo-800 font-bold">Total Classes</span>
              <span className="text-xl font-black text-indigo-600">{stats.classCount || 0}</span>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === 'STUDENT') {
      return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-6">
          <h3 className="font-bold text-gray-900 mb-4">My Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <span className="text-sm font-medium text-blue-900 flex items-center"><Calendar className="w-4 h-4 mr-2 text-blue-500"/> Today's Attendance</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${stats.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : stats.attendanceStatus === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                {stats.attendanceStatus?.replace('_', ' ') || 'PENDING'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3.5 bg-amber-50/50 rounded-xl border border-amber-100/50">
              <span className="text-sm font-medium text-amber-900 flex items-center"><FileText className="w-4 h-4 mr-2 text-amber-500"/> Pending Work</span>
              <span className="text-sm font-black text-amber-700 bg-amber-200/50 px-2.5 py-0.5 rounded-lg">{stats.pendingAssignments || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderQuickActions = () => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate('/admin/users')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Add User</span>
          </button>
          <button onClick={() => navigate('/academics')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5" /></div>
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Academics</span>
          </button>
        </div>
      );
    }

    if (user?.role === 'TEACHER') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate('/attendance')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-emerald-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Calendar className="w-5 h-5" /></div>
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide text-center leading-tight">Mark<br/>Attendance</span>
          </button>
          <button onClick={() => navigate('/assignments')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide text-center leading-tight">Post<br/>Assignment</span>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">{getGreeting()}, {user?.name}!</h1>
          <p className="text-blue-100 opacity-90 text-xs sm:text-sm font-medium">Here is what's happening at {user?.schoolName || 'your school'} today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Feed / Notices */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-600" /> Notice Board
            </h2>
          </div>

          {loading ? (
             <div className="flex justify-center p-12">
              <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
            </div>
          ) : notices.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-gray-600">You're all caught up!</p>
              <p className="text-xs mt-1">No new notices to show.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map(notice => (
                <div key={notice.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{notice.title}</h3>
                    {notice.targetRoles?.length > 0 && (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-100 shrink-0 ml-3">
                        {notice.targetRoles.join(', ')} Only
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed mb-4">{notice.content}</p>
                  <div className="flex items-center text-xs text-gray-400 font-medium pt-3 border-t border-gray-50">
                    <User className="w-3.5 h-3.5 mr-1" />
                    <span className="mr-4">{notice.author?.name} ({notice.author?.role})</span>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{new Date(notice.createdAt).toLocaleDateString()} at {new Date(notice.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-0">
          
          {renderQuickActions()}
          {renderQuickStats()}

          {/* Post Notice Widget (Admin/Teacher only) */}
          {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <Send className="w-4 h-4 mr-2 text-indigo-500" /> Post an Announcement
              </h3>
              <form onSubmit={handlePostNotice} className="space-y-3">
                <input 
                  required
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Subject title" 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                />
                <textarea 
                  required
                  rows="3" 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your announcement here..." 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 resize-none"
                />
                <select 
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 text-gray-600 font-medium"
                >
                  <option value="">Visible to Everyone</option>
                  <option value="TEACHER">Teachers Only</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="ACCOUNTS">Accounts Only</option>
                </select>
                <button 
                  type="submit" 
                  disabled={posting}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  {posting ? 'Posting...' : 'Publish'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
