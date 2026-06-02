import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Building2, Calendar, Users, X, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

export default function SchoolsManagement() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    validUntil: '',
    themeColor: '#3b82f6',
    description: '',
    adminName: '',
    adminPassword: ''
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools?includeArchived=true');
      setSchools(res.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/schools', formData);
      setShowAddModal(false);
      setFormData({ name: '', code: '', validUntil: '', themeColor: '#3b82f6', description: '', adminName: '', adminPassword: '' });
      fetchSchools();
      toast.success('School created successfully');
    } catch (error) {
      console.error('Failed to create school', error);
      toast.error(error.response?.data?.message || 'Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schools Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed management of all tenant schools</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-all font-medium text-sm focus:ring-4 focus:ring-blue-100"
        >
          <Plus className="w-4 h-4 mr-2" /> Add School
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">School Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schools.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">No schools found. Add a school to get started.</td>
                  </tr>
                ) : (
                  schools.map(school => {
                    const isActive = new Date(school.validUntil) > new Date();
                    return (
                      <tr 
                        key={school.id} 
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/super-admin/schools/${school.id}`)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 border border-blue-100 shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{school.name}</p>
                              <p className="text-xs text-gray-500 truncate">{school.settings?.description || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{school.code}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center text-gray-600 font-medium text-sm">
                            <Users className="w-4 h-4 mr-1.5 text-blue-500" />
                            <span>{school._count?.users || 0}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                              isActive 
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {isActive ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {isActive ? 'Valid Sub' : 'Expired Sub'}
                            </div>
                            
                            {school.isArchived ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">Archived</div>
                            ) : school.status === 'INACTIVE' ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">Inactive</div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-100 uppercase tracking-wider">Active</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            className="p-1.5 text-gray-400 group-hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD SCHOOL MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add New School</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. Springfield High" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Code (Numeric)</label>
                <input required type="number" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. 660" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input required type="date" min={new Date().toISOString().split('T')[0]} value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                <div className="flex items-center space-x-3">
                  <input type="color" value={formData.themeColor} onChange={e => setFormData({...formData, themeColor: e.target.value})} className="h-10 w-10 rounded border border-gray-200 cursor-pointer p-0" />
                  <span className="text-sm text-gray-500 font-mono">{formData.themeColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="Short description..." />
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Initial Admin User</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
                    <input type="text" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="••••••••" />
                  </div>
                  <p className="text-xs text-gray-500">
                    The admin's login ID (ERP ID) will be automatically generated based on the school code (e.g. {formData.code || 'XXX'}001).
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
