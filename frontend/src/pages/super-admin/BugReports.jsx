import React, { useState, useEffect } from 'react';
import { Building2, Bug, Clock, CheckCircle2, AlertCircle, RefreshCcw, Search, Image as ImageIcon, X } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function BugReports() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchBugs();
  }, []);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bugs');
      setBugs(res.data.bugs || []);
    } catch (error) {
      toast.error('Failed to fetch bug reports');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/bugs/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setBugs(bugs.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1"/> Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> In Progress</span>;
      case 'CLOSED':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Closed</span>;
      default:
        return null;
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(search.toLowerCase()) || 
                          bug.reportedBy?.name.toLowerCase().includes(search.toLowerCase()) ||
                          bug.reportedBy?.school?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || bug.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
            <Bug className="w-7 h-7 mr-3 text-blue-600" />
            Bug Reports
          </h1>
          <p className="text-sm text-gray-500 mt-2">Manage and track issues reported by users across all schools.</p>
        </div>
        <button 
          onClick={fetchBugs} 
          className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bugs, users, or schools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>Loading bug reports...</p>
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bugs found</h3>
            <p className="text-sm">Either there are no reports, or none match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredBugs.map((bug) => (
              <div key={bug.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(bug.status)}
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(bug.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{bug.title}</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {bug.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold mr-2">
                          {bug.reportedBy?.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-700 mr-1">{bug.reportedBy?.name}</span>
                        ({bug.reportedBy?.role.replace('_', ' ')})
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                      <div className="flex items-center font-medium text-gray-600">
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        {bug.reportedBy?.school?.name || 'Unknown School'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:w-64 shrink-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Update Status</p>
                      <select
                        value={bug.status}
                        onChange={(e) => updateStatus(bug.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-medium outline-none transition-colors cursor-pointer
                          ${bug.status === 'OPEN' ? 'border-red-200 bg-red-50 text-red-700' : ''}
                          ${bug.status === 'IN_PROGRESS' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}
                          ${bug.status === 'CLOSED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}
                        `}
                      >
                        <option value="OPEN" className="text-gray-900 bg-white">OPEN</option>
                        <option value="IN_PROGRESS" className="text-gray-900 bg-white">IN PROGRESS</option>
                        <option value="CLOSED" className="text-gray-900 bg-white">CLOSED</option>
                      </select>
                    </div>

                    {bug.screenshots && bug.screenshots.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                          <ImageIcon className="w-3.5 h-3.5 mr-1" /> Screenshots ({bug.screenshots.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {bug.screenshots.map((url, i) => (
                            <img 
                              key={i}
                              src={url} 
                              alt={`Screenshot ${i+1}`}
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImage(url)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl w-full flex justify-center animate-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img src={selectedImage} alt="Full size screenshot" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
