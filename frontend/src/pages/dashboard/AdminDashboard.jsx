import React from 'react';
import {
  Bell, Send, User, Clock, BookOpen, Calendar,
  FileText, Activity, Check, ArrowRight, UploadCloud, UserPlus, UserCheck,
  AlertCircle, DollarSign, ListTodo, ShieldCheck, Edit, Trash2, X
} from 'lucide-react';
import PushNotification from '../../components/PushNotification';
import { getGreeting, getCurrentDateText, getActivityIcon, getActivityBg, formatActivityTime } from './utils';

// Custom Animated SVG Attendance Trend Area Chart
function AttendanceTrendChart({ data }) {
  const activeDays = data.filter(d => d.rate !== null);

  if (activeDays.length === 0) {
    return (
      <div className="bg-gray-50/50 rounded-xl p-8 text-center text-gray-500 border border-gray-100 text-xs font-semibold">
        No attendance data recorded in the last 7 days.
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const padding = 20;

  const xMin = padding;
  const xMax = width - padding;
  const yMin = padding;
  const yMax = height - padding;

  const points = activeDays.map((d, index) => {
    const x = activeDays.length > 1
      ? xMin + (index / (activeDays.length - 1)) * (xMax - xMin)
      : (xMin + xMax) / 2;
    const y = yMax - (d.rate / 100) * (yMax - yMin);
    return { x, y, ...d };
  });

  const pathData = points.reduce((acc, p, index) => {
    return acc + (index === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  const areaPathData = points.length > 0
    ? `${pathData} L ${points[points.length - 1].x} ${yMax} L ${points[0].x} ${yMax} Z`
    : "";

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="attendanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={xMin} y1={yMin} x2={xMax} y2={yMin} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={xMin} y1={(yMin + yMax) / 2} x2={xMax} y2={(yMin + yMax) / 2} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={xMin} y1={yMax} x2={xMax} y2={yMax} stroke="#e5e7eb" strokeWidth={1} />

          {/* Area Fill */}
          {areaPathData && <path d={areaPathData} fill="url(#attendanceAreaGrad)" className="transition-all duration-700 ease-in-out" />}

          {/* Line stroke */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-in-out"
            />
          )}

          {/* Interactive dots */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={2}
                className="transition-all duration-200 group-hover/dot:r-5 group-hover/dot:fill-blue-600"
              />
              <title>{p.date}: {p.rate}%</title>
            </g>
          ))}
        </svg>
      </div>

      {/* Date Labels below chart */}
      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
        {points.map((p, idx) => (
          <span key={idx} className="text-center">{p.date.split(',')[0]}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({
  stats,
  calendarStatus,
  notices,
  user,
  navigate,
  title,
  setTitle,
  content,
  setContent,
  targetRoles,
  setTargetRoles,
  posting,
  handlePostNotice,
  isDispatchExpanded,
  setIsDispatchExpanded,
  editingNoticeId,
  resetNoticeForm,
  handleDeleteNotice,
  startEditingNotice,
}) {
  if (!stats) return null;

  // Check if new school onboard state
  if (stats.isNewSchool) {
    const steps = [
      {
        title: "Create Classes & Sections",
        desc: "Define the academic structure and grade levels for your school classes.",
        actionLabel: "Set Up Classes",
        path: "/academics",
        completed: stats.classCount > 0,
      },
      {
        title: "Add or Import Teachers",
        desc: "Create teacher profiles individually or bulk upload using spreadsheets.",
        actionLabel: "Manage Teachers",
        path: "/admin/users",
        completed: stats.teacherCount > 0,
      },
      {
        title: "Add or Import Students",
        desc: "Register student accounts and assign them to specific classes and sections.",
        actionLabel: "Manage Students",
        path: "/admin/users",
        completed: stats.studentCount > 0,
      },
      {
        title: "Set Up Class Timetable",
        desc: "Draft schedule entries connecting classes, subjects, teachers, and time slots.",
        actionLabel: "Draft Timetable",
        path: "/timetable",
        completed: false, // Default informational
      },
      {
        title: "Post Your First Notice",
        desc: "Publish an administrative announcement visible on all student and teacher panels.",
        actionLabel: "Publish Notice",
        path: "#post-notice",
        completed: notices.length > 0,
      }
    ];

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Welcome Banner */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-100">
              Setup Mode
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{getGreeting()}, School Admin!</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome to {user?.schoolName || 'Demo School'}. Let's get your campus running.</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-gray-700">{getCurrentDateText()}</div>
            <div className="text-xs text-gray-400 font-semibold mt-0.5">Initial Onboarding Checklist</div>
          </div>
        </div>

        {/* Onboarding Checklist Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Campus Setup Checklist</h2>
              <p className="text-xs text-gray-400">Complete these core steps to fully activate your School Operations dashboard.</p>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 rounded-2xl border border-gray-100/50 transition-all gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${step.completed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                    {step.completed ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{step.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (step.path.startsWith('#')) {
                      const el = document.getElementById(step.path.substring(1));
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      navigate(step.path);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${step.completed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                >
                  {step.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Adaptive flags
  const hasAttendanceData = stats.attendanceSnapshot && stats.attendanceSnapshot.filter(d => d.rate !== null).length > 0;
  const hasFinancialData = stats.financialSnapshot && (stats.financialSnapshot.feesCollected > 0 || stats.financialSnapshot.pendingFees > 0);
  const hasNotices = notices && notices.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* SECTION 0: Push Notification Banner */}
      <PushNotification />

      {/* SECTION 1: Welcome Banner */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{getGreeting()}, {user?.name}</h1>
          <p className="text-gray-500 text-xs sm:text-sm font-semibold mt-1">
            Welcome back to <span className="text-blue-600 font-bold">{user?.schoolName || 'Demo School'}</span>.
          </p>
        </div>
        <div className="text-left shrink-0 flex flex-col items-start md:items-end">
          {calendarStatus && (
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
              calendarStatus.status === 'WORKING' ? 'bg-green-100 text-green-700' :
              calendarStatus.status === 'HOLIDAY' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {calendarStatus.status === 'WORKING' ? 'Working Day' : calendarStatus.status}
              {calendarStatus.reason ? ` • ${calendarStatus.reason}` : ''}
            </span>
          )}
          <div className="text-sm font-bold text-gray-800">{getCurrentDateText()}</div>
          <div className="text-xs text-gray-400 font-semibold mt-0.5">Active Campus Monitoring</div>
        </div>
      </div>

      {/* SECTION 2: School Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Students */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black">Students</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">{stats.studentCount.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium">total</span>
          </div>
        </div>

        {/* Card 2: Teachers */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black">Teachers</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">{stats.teacherCount.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium">total</span>
          </div>
        </div>

        {/* Card 3: Classes */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black">Classes</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">{stats.classCount.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium">grades</span>
          </div>
        </div>

        {/* Card 4: Attendance */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black">Attendance</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">
              {stats.attendanceTodayRate > 0 ? `${stats.attendanceTodayRate}%` : (stats.actionCenter.attendancePendingCount > 0 ? 'Pending' : '0%')}
            </span>
            <span className="text-xs text-emerald-600 font-bold mt-1">today</span>
          </div>
        </div>

        {/* Card 5: Collected Fees */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black text-emerald-600">Collected Fees</span>
          {stats.feesCollected === 0 && stats.pendingFees === 0 ? (
            <span className="text-xs font-bold text-gray-400 mt-3.5 lowercase">no fee records yet</span>
          ) : (
            <div className="mt-3 flex items-baseline gap-0.5">
              <span className="text-base font-bold text-emerald-700">₹</span>
              <span className="text-xl font-black text-emerald-600">
                {stats.feesCollected >= 100000
                  ? `${(stats.feesCollected / 100000).toFixed(2)}L`
                  : stats.feesCollected.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* Card 6: Pending Fees */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-black text-amber-600">Pending Fees</span>
          {stats.feesCollected === 0 && stats.pendingFees === 0 ? (
            <span className="text-xs font-bold text-gray-400 mt-3.5 lowercase">no fee records yet</span>
          ) : (
            <div className="mt-3 flex items-baseline gap-0.5">
              <span className="text-base font-bold text-amber-700">₹</span>
              <span className="text-xl font-black text-amber-600">
                {stats.pendingFees >= 100000
                  ? `${(stats.pendingFees / 100000).toFixed(2)}L`
                  : stats.pendingFees.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: School Operational Snapshot */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">School Operational Snapshot</h3>
          </div>
          {stats.schoolHealth.pendingActionsCount > 0 && (
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100 flex items-center gap-1 shrink-0">
              <AlertCircle className="w-3.5 h-3.5" /> {stats.schoolHealth.pendingActionsCount} Items Need Attention
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* Metric 1: Students */}
          <div className="p-3 bg-gray-50/40 rounded-xl border border-gray-100/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Students</span>
            <span className="text-xs font-black text-gray-900 mt-1.5">{stats.studentCount.toLocaleString()} active</span>
          </div>
          {/* Metric 2: Teachers */}
          <div className="p-3 bg-gray-50/40 rounded-xl border border-gray-100/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Teachers</span>
            <span className="text-xs font-black text-gray-900 mt-1.5">{stats.teacherCount.toLocaleString()} active</span>
          </div>
          {/* Metric 3: Attendance */}
          <div className="p-3 bg-gray-50/40 rounded-xl border border-gray-100/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Attendance</span>
            <span className={`text-xs font-bold mt-1.5 ${stats.attendanceTodayRate > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.schoolHealth.attendance}
            </span>
          </div>
          {/* Metric 4: Fees */}
          <div className="p-3 bg-gray-50/40 rounded-xl border border-gray-100/50 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Fee Status</span>
            <span className={`text-xs font-bold mt-1.5 ${stats.feesCollected > 0 ? 'text-indigo-600' : 'text-gray-500'}`}>
              {stats.schoolHealth.fees}
            </span>
          </div>
          {/* Metric 5: Last Import */}
          <div className="p-3 bg-gray-50/40 rounded-xl border border-gray-100/50 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Last Import</span>
            <span className="text-xs font-bold text-gray-700 mt-1.5 truncate" title={stats.actionCenter.recentImportsText}>
              {stats.actionCenter.recentImportsText.replace("Imported ", "")}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Today's Action Center */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-indigo-500" /> Today's Action Center
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Attendance Pending */}
          <div className="bg-gray-50/30 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Attendance Awaiting</span>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.actionCenter.attendancePendingCount}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-normal">
                {stats.actionCenter.attendancePendingCount > 0
                  ? `${stats.actionCenter.attendancePendingCount} classes have not yet recorded attendance.`
                  : 'All classes completed.'}
              </p>
            </div>
            {stats.actionCenter.attendancePendingCount > 0 && (
              <button onClick={() => navigate('/attendance')} className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0">
                Mark Attendance <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action 2: Pending Fee Records */}
          <div className="bg-gray-50/30 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pending Fee Records</span>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.actionCenter.pendingFeeRecordsCount}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-normal">
                {stats.actionCenter.pendingFeeRecordsCount > 0
                  ? `${stats.actionCenter.pendingFeeRecordsCount} student fee invoices are awaiting collection.`
                  : 'All fees collected.'}
              </p>
            </div>
            {stats.actionCenter.pendingFeeRecordsCount > 0 && (
              <button onClick={() => navigate('/fees')} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0">
                Manage Fees <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action 3: Recent Notices */}
          <div className="bg-gray-50/30 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Recent Notices</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mt-1.5 border border-purple-100">
                <Bell className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-700 font-semibold mt-3 leading-snug">
                {stats.actionCenter.recentNoticesText}
              </p>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('notices-sec');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-4 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
            >
              View Notice Board <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 4: Recent Imports */}
          <div className="bg-gray-50/30 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Import Status</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mt-1.5 border border-amber-100">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-700 font-semibold mt-3 leading-snug">
                {stats.actionCenter.recentImportsText}
              </p>
            </div>
            <button onClick={() => navigate('/admin/import')} className="mt-4 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0">
              Import Data Wizard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Content: Split Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Dynamic Activity Feed & Distribution (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 4: Recent Activity Feed */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Recent Campus Activities
            </h3>
            {stats.activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-semibold">
                No active operations logged today.
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 border-l border-gray-100 ml-3">
                {stats.activities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[35px] top-0.5 w-6.5 h-6.5 rounded-full border flex items-center justify-center transition-all ${getActivityBg(act.type)}`}>
                      {getActivityIcon(act.type)}
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">
                        {formatActivityTime(act.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: Academic Snapshot (Compact Scrollable View) */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm max-h-[350px] flex flex-col">
            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 flex items-center gap-2 shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Student Class Distribution
            </h3>
            {stats.academicSnapshot.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-semibold">
                No student enrollments registered yet.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 pr-1.5 space-y-4 scrollbar-thin">
                {(() => {
                  const maxCount = Math.max(...stats.academicSnapshot.map(s => s.studentCount), 1);
                  return stats.academicSnapshot.map((item, idx) => (
                    <div key={idx} className="space-y-1 group">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{item.className}</span>
                        <span className="text-gray-400 font-semibold">{item.studentCount} student{item.studentCount > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500 group-hover:bg-blue-600"
                          style={{ width: `${(item.studentCount / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Trends and Finance Widgets (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 6: Attendance Snapshot */}
          {hasAttendanceData && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> Attendance Trends
                </h3>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">7 Days</span>
              </div>
              <AttendanceTrendChart data={stats.attendanceSnapshot} />
            </div>
          )}

          {/* SECTION 7: Financial Snapshot */}
          {hasFinancialData && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" /> Financial Operations
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-emerald-50/20 border border-emerald-100/55 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Collected</span>
                    <div className="text-lg font-black text-emerald-600 mt-1">₹{stats.feesCollected.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-3.5 bg-amber-50/20 border border-amber-100/55 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Pending</span>
                    <div className="text-lg font-black text-amber-600 mt-1">₹{stats.pendingFees.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Fee Collection Progress</span>
                    <span className="text-emerald-600">{stats.financialSnapshot.collectionRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.financialSnapshot.collectionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Post Notice Quick Access (Collapsible Sidebar Accordion) */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm transition-all" id="post-notice">
            <div
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => setIsDispatchExpanded(!isDispatchExpanded)}
            >
              <h3 className="font-bold text-gray-900 flex items-center">
                <Send className="w-4 h-4 mr-2 text-indigo-500" /> {editingNoticeId ? 'Edit Announcement' : 'Dispatch Announcement'}
              </h3>
              <span className="text-xs text-indigo-600 font-bold hover:underline bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {isDispatchExpanded ? 'Collapse' : 'Expand'}
              </span>
            </div>
            {isDispatchExpanded && (
              <form onSubmit={handlePostNotice} className="space-y-3.5 mt-4 transition-all duration-300">
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-gray-50/50"
                />
                <textarea
                  required
                  rows="3"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write message contents..."
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-gray-50/50 resize-none"
                />
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Target Audience</label>
                  <div className="flex flex-wrap gap-2">
                    {['TEACHER', 'STUDENT', 'ACCOUNTS'].map(role => (
                      <label key={role} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center select-none ${targetRoles.includes(role) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
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
                    <div className="text-[10px] text-gray-400 font-semibold ml-2 flex items-center">
                      (Leave all unchecked for Everyone)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={posting}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    <Send className="w-3.5 h-3.5" /> {posting ? (editingNoticeId ? 'Updating...' : 'Dispatching...') : (editingNoticeId ? 'Update Notice' : 'Dispatch Announcement')}
                  </button>
                  {editingNoticeId && (
                    <button
                      type="button"
                      onClick={resetNoticeForm}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 8: Notice Board */}
      {hasNotices && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm" id="notices-sec">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" /> Published School Notices
            </h3>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">All Announcements</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {notices.map((notice) => (
              <div key={notice.id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:border-gray-200 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{notice.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {notice.targetRoles?.length > 0 ? notice.targetRoles.map(role => (
                        <span key={role} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded-md uppercase">
                          {role}{notice.targetRoles.length === 1 ? ' ONLY' : ''}
                        </span>
                      )) : (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded-md uppercase">
                          EVERYONE
                        </span>
                      )}
                      {new Date(notice.updatedAt).getTime() - new Date(notice.createdAt).getTime() > 1000 && (
                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-500 text-[9px] font-bold rounded-md uppercase italic" title="This notice has been edited">
                          Edited
                        </span>
                      )}
                      {(user?.role === 'ADMIN' || user?.userId === notice.createdBy || user?.id === notice.createdBy) && (
                        <div className="flex items-center gap-1 ml-1">
                          <button onClick={() => startEditingNotice(notice)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded bg-transparent border-0 cursor-pointer" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteNotice(notice.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded bg-transparent border-0 cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed line-clamp-4 font-medium">
                    {notice.content}
                  </p>
                </div>

                <div className="flex items-center text-[10px] text-gray-400 font-bold pt-3 mt-3 border-t border-gray-100/50">
                  <User className="w-3 h-3 mr-1" />
                  <span className="mr-3">{notice.author?.name}</span>
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 9: Quick Actions Shortcut Dashboard */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-3 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" /> Administrative Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1 */}
          <button onClick={() => navigate('/admin/users')} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform"><UserPlus className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Add Student</span>
          </button>
          {/* Action 2 */}
          <button onClick={() => navigate('/admin/users')} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform"><UserCheck className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Add Teacher</span>
          </button>
          {/* Action 3 */}
          <button
            onClick={() => {
              setIsDispatchExpanded(true);
              setTimeout(() => {
                const el = document.getElementById('post-notice');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:bg-purple-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform"><Bell className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Create Notice</span>
          </button>
          {/* Action 4 */}
          <button onClick={() => navigate('/admin/import')} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-amber-200 hover:bg-amber-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform"><UploadCloud className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Import Data</span>
          </button>
          {/* Action 5 */}
          <button onClick={() => navigate('/academics')} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform"><BookOpen className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Manage Classes</span>
          </button>
          {/* Action 6 */}
          <button onClick={() => navigate('/timetable')} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-sky-200 hover:bg-sky-50/10 transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform"><Calendar className="w-4.5 h-4.5" /></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Manage Timetable</span>
          </button>
        </div>
      </div>
    </div>
  );
}
