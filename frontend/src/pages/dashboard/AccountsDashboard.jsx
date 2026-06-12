import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { 
  DollarSign, AlertCircle, TrendingUp, CreditCard, Clock, 
  CheckCircle, ChevronRight, FileText, UploadCloud, Bell, Activity, Plus
} from 'lucide-react';
import ResponsiveTable from '../../components/ui/ResponsiveTable';
import PushNotification from '../../components/PushNotification';

function CollectionTrendChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.amount));
  
  return (
    <div className="flex items-end justify-between h-12 w-full mt-2 gap-1">
      {data.map((week, idx) => {
        const height = max > 0 ? (week.amount / max) * 100 : 0;
        return (
          <div key={idx} className="relative flex-1 flex flex-col justify-end group">
            <div 
              className="bg-emerald-500 rounded-t-sm w-full transition-all duration-500 ease-in-out hover:bg-emerald-600"
              style={{ height: `${Math.max(5, height)}%` }}
            ></div>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {week.name}: ₹{(week.amount / 100).toLocaleString('en-IN')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AccountsDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/accounts');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch accounts dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <span className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!data) return null;

  // Formatting helpers
  const formatMoney = (cents) => `₹${(cents / 100).toLocaleString('en-IN')}`;
  const formatMoneyCompact = (cents) => {
    const rupees = cents / 100;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
    if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
    return `₹${rupees.toFixed(0)}`;
  };

  const getHealthColors = (status) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Needs Attention': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'Active': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  // Progress bar calculation for Collection Snapshot
  const snap = data.collectionSnapshot;
  const totalSnap = snap.paidAmount + snap.outstandingAmount + snap.overdueAmount;
  const paidPct = totalSnap > 0 ? (snap.paidAmount / totalSnap) * 100 : 0;
  const outPct = totalSnap > 0 ? (snap.outstandingAmount / totalSnap) * 100 : 0;
  const overPct = totalSnap > 0 ? (snap.overdueAmount / totalSnap) * 100 : 0;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* SECTION 0: Push Notification Banner */}
      <PushNotification />

      {/* 1. Welcome Banner */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name || 'Accounts Officer'}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-semibold mt-1">
            Welcome back to <span className="text-blue-600 font-bold">{user?.schoolName || 'Demo School'}</span>.
          </p>
        </div>
        <div className="text-left shrink-0">
          <div className="text-sm font-bold text-gray-800">{today}</div>
          <div className="text-xs text-gray-400 font-semibold mt-0.5 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" /> Fee Collection Workspace
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Collected</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(data.kpis.totalCollected)}</h3>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(data.kpis.totalOutstanding)}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Overdue Invoices</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{data.kpis.overdueCount}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-start mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-400">This Month</span>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <p className="text-sm font-medium text-gray-500 mt-3">Payments Received</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{data.kpis.paymentsThisMonthCount}</h3>
              <div className="w-16">
                <CollectionTrendChart data={data.collectionTrend} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 3. Collection Health Status */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-emerald-500" /> Collection Health
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Collection Rate ({data.health.collectionRate}%)</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getHealthColors(data.health.collectionRateStatus)}`}>
                    {data.health.collectionRateStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Outstanding Invoices</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getHealthColors(data.health.outstandingInvoicesStatus)}`}>
                    {data.health.outstandingInvoicesStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Recent Activity</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getHealthColors(data.health.recentActivityStatus)}`}>
                    {data.health.recentActivityStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Today's Priorities */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-amber-500" /> Today's Priorities
                </h2>
              </div>
              <div className="space-y-3">
                <button onClick={() => navigate('/fees')} className="w-full flex justify-between items-center p-3 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-100 transition-colors group text-left">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-red-600 font-bold border border-red-100">
                      {data.priorities.overdueInvoices}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-red-700 transition-colors">Overdue Invoices</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                </button>
                <button onClick={() => navigate('/fees')} className="w-full flex justify-between items-center p-3 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100 transition-colors group text-left">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-amber-600 font-bold border border-amber-100">
                      {data.priorities.invoicesDueToday}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700 transition-colors">Invoices Due Today</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600" />
                </button>
                <button onClick={() => navigate('/fees')} className="w-full flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 transition-colors group text-left">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 text-emerald-600 font-bold border border-emerald-100">
                      {data.priorities.paymentsReceivedToday}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors">Payments Received Today</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
                </button>
              </div>
            </div>
          </div>

          {/* 6. Pending Invoice Overview */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900">Pending Invoice Overview</h2>
              <button onClick={() => navigate('/fees')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center transition-colors">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            {data.pendingInvoices.length > 0 ? (
              <div className="border-t border-gray-50">
                <ResponsiveTable
                  data={data.pendingInvoices}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No pending invoices at the moment."
                  emptyIcon={FileText}
                  columns={[
                    {
                      header: 'Student',
                      render: (inv) => (
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{inv.studentName}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{inv.erpId}</p>
                        </div>
                      )
                    },
                    {
                      header: 'Invoice Amount',
                      render: (inv) => (
                        <span className="font-mono font-medium text-gray-600 text-sm">
                          {formatMoney(inv.totalAmount)}
                        </span>
                      )
                    },
                    {
                      header: 'Outstanding',
                      render: (inv) => (
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {formatMoney(inv.outstandingAmount)}
                        </span>
                      )
                    },
                    {
                      header: 'Status',
                      render: (inv) => (
                        inv.isOverdue ? (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-100 inline-flex items-center">OVERDUE</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100 inline-flex items-center">PENDING</span>
                        )
                      )
                    }
                  ]}
                  renderMobileCard={(inv) => (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{inv.studentName}</h3>
                          <p className="text-xs text-gray-500 font-mono">ID: {inv.erpId}</p>
                        </div>
                        <div>
                          {inv.isOverdue ? (
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-100 inline-flex items-center">OVERDUE</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100 inline-flex items-center">PENDING</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500 text-xs block">Invoice Amount</span><span className="font-mono font-medium text-gray-600">{formatMoney(inv.totalAmount)}</span></div>
                        <div><span className="text-gray-500 text-xs block">Outstanding</span><span className="font-mono font-bold text-gray-900">{formatMoney(inv.outstandingAmount)}</span></div>
                      </div>
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No pending invoices at the moment.</div>
            )}
          </div>

        </div>
        
        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* 9. Quick Actions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/fees')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                <DollarSign className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-700">Record Payment</span>
              </button>
              <button onClick={() => navigate('/fees')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-all group">
                <Clock className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-700 text-center">View Outstanding</span>
              </button>
              <button onClick={() => navigate('/fees')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <FileText className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-700">Generate Invoice</span>
              </button>
              <button onClick={() => navigate('/admin/import')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                <UploadCloud className="w-6 h-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-700">Import Data</span>
              </button>
            </div>
          </div>

          {/* 7. Collection Snapshot */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Collection Snapshot</h2>
            {totalSnap > 0 ? (
              <div className="space-y-5">
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${paidPct}%` }} className="bg-emerald-500 h-full" title={`Paid: ${formatMoney(snap.paidAmount)}`}></div>
                  <div style={{ width: `${outPct}%` }} className="bg-amber-400 h-full" title={`Outstanding: ${formatMoney(snap.outstandingAmount)}`}></div>
                  <div style={{ width: `${overPct}%` }} className="bg-red-500 h-full" title={`Overdue: ${formatMoney(snap.overdueAmount)}`}></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>
                      <span className="text-xs text-gray-500 font-medium">Paid</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatMoneyCompact(snap.paidAmount)}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></div>
                      <span className="text-xs text-gray-500 font-medium">Pending</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatMoneyCompact(snap.outstandingAmount)}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>
                      <span className="text-xs text-gray-500 font-medium">Overdue</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatMoneyCompact(snap.overdueAmount)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">No collection data yet.</div>
            )}
          </div>

          {/* 8. Notice Peek */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <button 
              onClick={() => setIsNoticeOpen(!isNoticeOpen)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Bell className={`w-5 h-5 mr-3 ${data.notices.length > 0 ? 'text-indigo-500' : 'text-gray-400'}`} />
                <h2 className="text-base font-bold text-gray-900">Notices</h2>
              </div>
              <div className="flex items-center">
                {data.notices.length > 0 && !isNoticeOpen && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full mr-3">
                    {data.notices.length} New
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isNoticeOpen ? 'rotate-90' : ''}`} />
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out ${isNoticeOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
              <div className="px-5 pb-4 space-y-3">
                {data.notices.length > 0 ? (
                  data.notices.map(notice => (
                    <div key={notice.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                      <p className="font-semibold text-sm text-gray-900">{notice.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(notice.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-sm text-gray-500">No recent notices published.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Recent Financial Activity */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-bold text-gray-900 mb-4">Recent Activity</h2>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity, idx) => (
                  <div key={activity.id} className="flex relative">
                    {idx !== data.recentActivity.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-gray-100"></div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white
                      ${activity.type === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-600' :
                        activity.type === 'INVOICE_GENERATED' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'}
                    `}>
                      {activity.type === 'PAYMENT_RECEIVED' && <DollarSign className="w-4 h-4" />}
                      {activity.type === 'INVOICE_GENERATED' && <FileText className="w-4 h-4" />}
                      {activity.type === 'FEE_STRUCTURE_UPDATED' && <Activity className="w-4 h-4" />}
                    </div>
                    <div className="ml-3 pb-1">
                      <p className="text-sm text-gray-800 leading-tight">{activity.description}</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">No recent activity recorded.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
