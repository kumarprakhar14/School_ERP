import React from 'react';
import { 
  Bell, Send, User, Clock, CheckCircle, Calendar, 
  FileText, Activity, ListTodo, Edit, Trash2, X
} from 'lucide-react';
import PushNotification from '../../components/PushNotification';
import { getGreeting } from './utils';

export default function GeneralDashboard({
  stats,
  notices,
  user,
  navigate,
  loading,
  title,
  setTitle,
  content,
  setContent,
  targetRoles,
  setTargetRoles,
  posting,
  handlePostNotice,
  editingNoticeId,
  resetNoticeForm,
  handleDeleteNotice,
  startEditingNotice,
}) {

  // -----------------------------------------------------------------------------
  // ROLE: STUDENT VIEW
  // -----------------------------------------------------------------------------
  const renderStudentView = () => {
    if (!stats) return null;
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" /> My Status
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3.5 bg-blue-50/30 rounded-xl border border-blue-100/50">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-500"/> Today's Attendance
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${stats.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : stats.attendanceStatus === 'ABSENT' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
              {stats.attendanceStatus?.replace('_', ' ') || 'PENDING'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3.5 bg-amber-50/30 rounded-xl border border-amber-100/50">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-amber-500"/> Pending Assignments
            </span>
            <span className="text-sm font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-200">
              {stats.pendingAssignments || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------------
  // GENERAL ROLE VIEWS (STUDENT / TEACHER / GENERAL)
  // -----------------------------------------------------------------------------
  const renderGeneralView = () => {
    return (
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
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-gray-700">You're all caught up!</p>
              <p className="text-xs text-gray-400 mt-1">No announcements published yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map(notice => (
                <div key={notice.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{notice.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {notice.targetRoles?.length > 0 ? notice.targetRoles.map(role => (
                        <span key={role} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-100">
                          {role}{notice.targetRoles.length === 1 ? ' ONLY' : ''}
                        </span>
                      )) : (
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-indigo-100">
                          EVERYONE
                        </span>
                      )}
                      {new Date(notice.updatedAt).getTime() - new Date(notice.createdAt).getTime() > 1000 && (
                        <span className="px-2.5 py-0.5 bg-gray-50 border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-md italic" title="This notice has been edited">
                          Edited
                        </span>
                      )}
                      {(user?.role === 'ADMIN' || user?.userId === notice.createdBy || user?.id === notice.createdBy) && (
                        <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditingNotice(notice)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded bg-transparent border-0 cursor-pointer" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteNotice(notice.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded bg-transparent border-0 cursor-pointer" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed mb-4">{notice.content}</p>
                  <div className="flex items-center text-xs text-gray-400 font-medium pt-3 border-t border-gray-100">
                    <User className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    <span className="mr-4">{notice.author?.name} ({notice.author?.role})</span>
                    <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    <span>{new Date(notice.createdAt).toLocaleDateString()} at {new Date(notice.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions (General) */}
          {user?.role === 'TEACHER' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-500" /> Teacher Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => navigate('/attendance')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 hover:bg-blue-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform"><Calendar className="w-4.5 h-4.5" /></div>
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Mark Attendance</span>
                </button>
                <button onClick={() => navigate('/assignments')} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-200 hover:bg-indigo-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform"><FileText className="w-4.5 h-4.5" /></div>
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Post Assignment</span>
                </button>
              </div>
            </div>
          )}

          {user?.role === 'STUDENT' && renderStudentView()}

          {/* Post Notice Form (Teacher only) */}
          {user?.role === 'TEACHER' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <Send className="w-4 h-4 mr-2 text-indigo-500" /> {editingNoticeId ? 'Edit Announcement' : 'Post an Announcement'}
              </h3>
              <form onSubmit={handlePostNotice} className="space-y-3">
                <input 
                  required
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Subject title" 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-gray-50/50"
                />
                <textarea 
                  required
                  rows="3" 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write announcement details..." 
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-gray-50/50 resize-none"
                />
                <div className="space-y-1.5 pt-1">
                  <label className="text-sm font-bold text-gray-700 ml-1">Target Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {['TEACHER', 'STUDENT', 'ACCOUNTS'].map(role => (
                      <label key={role} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm font-bold transition-all flex items-center select-none ${targetRoles.includes(role) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={targetRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetRoles([...targetRoles, role]);
                            } else {
                              setTargetRoles(targetRoles.filter(r => r !== role));
                            }
                          }}
                        />
                        {role === 'TEACHER' ? 'Teachers' : role === 'STUDENT' ? 'Students' : 'Accounts'}
                      </label>
                    ))}
                    <div className="text-[11px] text-gray-400 font-semibold ml-2 flex items-center">
                      (Leave all unchecked for Everyone)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={posting}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 border-0 cursor-pointer"
                  >
                    {posting ? (editingNoticeId ? 'Updating...' : 'Posting...') : (editingNoticeId ? 'Update Notice' : 'Publish Notice')}
                  </button>
                  {editingNoticeId && (
                    <button
                      type="button"
                      onClick={resetNoticeForm}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors shadow-sm border-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* SECTION 0: Push Notification Banner */}
      <PushNotification />

      {/* Welcome Banner (General) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-600/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm border border-white/15">
            {user?.role} Portal
          </span>
          <h1 className="text-2xl font-bold mt-2.5 mb-1">{getGreeting()}, {user?.name}!</h1>
          <p className="text-blue-100 opacity-90 text-xs sm:text-sm font-semibold">Here is what's happening at {user?.schoolName || 'your school'} today.</p>
        </div>
      </div>

      {renderGeneralView()}
    </div>
  );
}
