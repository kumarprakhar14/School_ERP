import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../../services/api/reports';
import { Users, UserX, CalendarClock, Target, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import InfiniteScroll from 'react-infinite-scroll-component';

export default function AttendanceReportTab({ filters, setLoading, onError }) {
  const [summary, setSummary] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [lowPage, setLowPage] = useState(1);
  const [lowHasMore, setLowHasMore] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [filters]);

  useEffect(() => {
    fetchLowAttendance(lowPage);
  }, [filters, lowPage]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [summaryRes, rankingRes] = await Promise.all([
        reportsApi.getAttendanceSummary(filters),
        reportsApi.getAttendanceRanking(filters)
      ]);
      setSummary(summaryRes.data);
      setRanking(rankingRes.data);
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowAttendance = async (pageNum = 1) => {
    try {
      const res = await reportsApi.getLowAttendance({ ...filters, threshold: 75, page: pageNum, limit: 10 });
      const { data, pagination } = res.data ? res : { data: res.data || res, pagination: res.pagination };
      if (pageNum === 1) {
        setLowAttendance(data || []);
      } else {
        setLowAttendance(prev => [...prev, ...(data || [])]);
      }
      setLowHasMore(pageNum < (pagination?.totalPages || 1));
    } catch (error) {
      console.error(error);
    }
  };

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Working Days</p>
              <h3 className="text-2xl font-bold text-gray-900">{summary.workingDays}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Present</p>
              <h3 className="text-2xl font-bold text-gray-900">{summary.presentCount}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Absent</p>
              <h3 className="text-2xl font-bold text-gray-900">{summary.absentCount}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500 mb-1">Avg. Attendance Rate</p>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-indigo-700">{summary.attendancePercentage ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${summary.attendancePercentage ?? 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Top 10 Attendance</h3>
          </div>
          <div className="p-4 flex-1 overflow-auto max-h-[400px] custom-scrollbar">
            {ranking.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No data available.</p>
            ) : (
              <ul className="space-y-3">
                {ranking.map((student, idx) => (
                  <li key={student.studentId} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.erpId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-emerald-600">{student.attendancePercentage}%</p>
                      <p className="text-xs text-gray-400">{student.presentCount} Days</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Low Attendance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-gray-900">Low Attendance</h3>
            </div>
            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-md">Below 75%</span>
          </div>
          <div className="p-4 flex-1 overflow-auto max-h-[400px] custom-scrollbar" id="low-attendance-scroll-target">
            {lowAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-gray-900 font-medium text-sm">All Good!</p>
                <p className="text-gray-500 text-xs mt-1">No students have attendance below 75%.</p>
              </div>
            ) : (
              <InfiniteScroll
                dataLength={lowAttendance.length}
                next={() => setLowPage(p => p + 1)}
                hasMore={lowHasMore}
                loader={<div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
                scrollableTarget="low-attendance-scroll-target"
                className="space-y-3"
              >
                {lowAttendance.map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 rounded-xl bg-red-50/40 border border-red-100/50 hover:bg-red-50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{student.name}</p>
                      <p className="text-xs text-red-400">{student.erpId}</p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-lg border border-red-100 shadow-sm">
                      <p className="font-bold text-sm text-red-600">{student.attendancePercentage}%</p>
                    </div>
                  </div>
                ))}
              </InfiniteScroll>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
