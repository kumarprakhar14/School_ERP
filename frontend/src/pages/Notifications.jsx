import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Clock, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { resolveNotificationRoute } from '../lib/resolveNotificationRoute';
import useAuthStore from '../store/authStore';

const groupNotifications = (notifications) => {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Older': []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  notifications.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= todayStart) {
      groups['Today'].push(n);
    } else if (d >= yesterdayStart) {
      groups['Yesterday'].push(n);
    } else if (d >= weekStart) {
      groups['This Week'].push(n);
    } else {
      groups['Older'].push(n);
    }
  });

  return groups;
};

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const navigate = useNavigate();

  const fetchHistory = async (pageNum = 1) => {
    try {
      const res = await api.get(`/notifications?page=${pageNum}&limit=20`);
      const { notifications: newNotifs, pagination } = res.data;
      
      if (pageNum === 1) {
        setNotifications(newNotifs);
      } else {
        setNotifications(prev => [...prev, ...newNotifs]);
      }
      
      setHasMore(pageNum < pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch notification history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.put('/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const grouped = groupNotifications(notifications);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center">
            <Bell className="w-7 h-7 mr-3 text-blue-600" />
            Notification Center
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Your recent alerts, notices, and reminders.
          </p>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {markingRead ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && page === 1 ? (
          <div className="p-12 text-center">
            <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin inline-block"></span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <Bell className="h-12 w-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">It's quiet here</h3>
            <p className="text-sm mt-1">You don't have any notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null;
              
              return (
                <div key={label} className="p-0">
                  <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-50 sticky top-0 z-10 backdrop-blur-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">{label}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map(n => {
                      const route = resolveNotificationRoute(n.entityType, n.entityId, user?.role);
                      return (
                        <Link
                          key={n.id}
                          to={route}
                          onClick={async () => {
                            if (!n.isRead) {
                              try {
                                await api.put('/notifications/read', { ids: [n.id] });
                                setNotifications(prev =>
                                  prev.map(x => x.id === n.id ? { ...x, isRead: true } : x)
                                );
                              } catch (err) {
                                console.error('Failed to mark notification as read', err);
                              }
                            }
                          }}
                          className={`p-6 transition-colors hover:bg-gray-50/50 flex gap-4 items-start ${!n.isRead ? 'bg-blue-50/10' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Bell className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                              <h4 className={`text-base font-bold mb-1 leading-snug ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                {n.title}
                              </h4>
                              <div className="flex items-center shrink-0 text-xs font-semibold text-gray-400 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <p className={`text-sm leading-relaxed ${!n.isRead ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                              {n.body}
                            </p>
                            {!n.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 mt-2">
                                NEW
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {hasMore && (
              <div className="p-6 text-center border-t border-gray-50">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold border border-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Load Older Notifications'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
