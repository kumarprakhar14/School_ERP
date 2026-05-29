import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Building2, Calendar, Users, MoreVertical, X } from 'lucide-react';

export default function SchoolsList() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    validUntil: '',
    themeColor: '#3b82f6',
    description: ''
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
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
      setFormData({ name: '', validUntil: '', themeColor: '#3b82f6', description: '' });
      fetchSchools();
    } catch (error) {
      console.error('Failed to create school', error);
      alert(error.response?.data?.message || 'Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (school) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      validUntil: new Date(school.validUntil).toISOString().split('T')[0],
      themeColor: school.settings?.themeColor || '#3b82f6',
      description: school.settings?.description || ''
    });
    setActiveDropdown(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/schools/${editingSchool.id}`, formData);
      setShowEditModal(false);
      setEditingSchool(null);
      setFormData({ name: '', validUntil: '', themeColor: '#3b82f6', description: '' });
      fetchSchools();
    } catch (error) {
      console.error('Failed to update school', error);
      alert(error.response?.data?.message || 'Failed to update school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schools Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage tenant schools and their subscriptions</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map(school => (
            <div key={school.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50 group-hover:opacity-100 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center border border-blue-100/50 shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === school.id ? null : school.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50 focus:outline-none"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeDropdown === school.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                        <button 
                          onClick={() => handleEditClick(school)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit Settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1">{school.name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-1">{school.settings?.description || 'No description provided.'}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-5 bg-gray-50/80 p-2.5 rounded-lg">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="font-medium text-gray-700">Valid till: {new Date(school.validUntil).toLocaleDateString()}</span>
                </div>

                <div className="pt-4 border-t border-gray-100/80 flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600 font-medium">
                    <Users className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span>{school._count?.users || 0} Users</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                    new Date(school.validUntil) > new Date() 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {new Date(school.validUntil) > new Date() ? 'Active' : 'Expired'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Add New School</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. Springfield High" />
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
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Edit School</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. Springfield High" />
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
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
