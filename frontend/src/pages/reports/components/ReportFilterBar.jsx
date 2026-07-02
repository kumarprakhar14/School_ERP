import React, { useState, useEffect } from 'react';
import { Calendar, Users, Building, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export default function ReportFilterBar({ onFilterChange, isLoading }) {
  const [preset, setPreset] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [classes, setClasses] = useState([]);
  
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClasses(res.data);
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      }
    };
    fetchClasses();
  }, []);

  const selectedClass = classes.find(c => c.id === classId);
  const sections = selectedClass?.sections || [];

  const presets = ['Today', 'This Week', 'This Month', 'Last Month', 'This Year', 'Custom Range'];

  const handleApply = () => {
    const filters = { preset };
    if (preset === 'Custom Range') {
      if (!startDate || !endDate) {
        toast.error('Please select both Start Date and End Date for Custom Range.');
        return;
      }
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;

    onFilterChange(filters);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
        <div className="relative">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full appearance-none pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          >
            {presets.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {preset === 'Custom Range' && (
        <>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </>
      )}

      {/* Class & Section filtering via Dropdowns */}
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Class (Optional)</label>
        <div className="relative">
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId(''); // Reset section when class changes
            }}
            className="w-full appearance-none pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
      
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Section (Optional)</label>
        <div className="relative">
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId || sections.length === 0}
            className="w-full appearance-none pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={isLoading}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-500/20"
      >
        <Filter className="w-4 h-4" />
        {isLoading ? 'Applying...' : 'Apply Filters'}
      </button>
    </div>
  );
}
