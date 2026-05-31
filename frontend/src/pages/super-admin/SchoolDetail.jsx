import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { Building2, Calendar, Users, Edit2, Save, Shield, User, X, Trash2, Key } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function SchoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing School Details
  const [editingField, setEditingField] = useState(null);
  const [schoolFormData, setSchoolFormData] = useState({});
  const editInputRef = useRef(null);

  // Admin User Management
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSchoolConfirm, setShowDeleteSchoolConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', password: '', contactDetails: '' });

  useEffect(() => {
    fetchSchoolData();
  }, [id]);

  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingField]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      const [schoolRes, adminsRes] = await Promise.all([
        api.get(`/schools/${id}`),
        api.get(`/users?schoolId=${id}&role=ADMIN`)
      ]);
      setSchool(schoolRes.data);
      setAdmins(adminsRes.data);
      
      setSchoolFormData({
        name: schoolRes.data.name,
        validUntil: new Date(schoolRes.data.validUntil).toISOString().split('T')[0],
        themeColor: schoolRes.data.settings?.themeColor || '#3b82f6',
        description: schoolRes.data.settings?.description || ''
      });
    } catch (error) {
      toast.error('Failed to load school details');
      navigate('/super-admin/schools');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchool = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/schools/${id}`, schoolFormData);
      toast.success('School updated successfully');
      fetchSchoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update school');
    } finally {
      setIsSubmitting(false);
      setEditingField(null);
    }
  };

  const handleDeleteSchool = async () => {
    try {
      await api.delete(`/schools/${id}`);
      toast.success('School and all associated data deleted successfully');
      navigate('/super-admin/schools');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete school');
      setShowDeleteSchoolConfirm(false);
    }
  };

  // Admin Handlers
  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        ...adminFormData,
        role: 'ADMIN',
        schoolId: id
      });
      toast.success('Admin user added successfully');
      setShowAddAdminModal(false);
      setAdminFormData({ name: '', password: '', contactDetails: '' });
      fetchSchoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAdminSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/users/${selectedAdmin.id}`, {
        name: adminFormData.name,
        password: adminFormData.password,
        contactDetails: adminFormData.contactDetails,
        role: 'ADMIN'
      });
      toast.success('Admin updated successfully');
      setShowEditAdminModal(false);
      setSelectedAdmin(null);
      setAdminFormData({ name: '', password: '', contactDetails: '' });
      fetchSchoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      await api.delete(`/users/${selectedAdmin.id}`);
      toast.success('Admin deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedAdmin(null);
      fetchSchoolData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete admin');
      setShowDeleteConfirm(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUpdateSchool();
    if (e.key === 'Escape') {
      setEditingField(null);
      setSchoolFormData({
        name: school.name,
        validUntil: new Date(school.validUntil).toISOString().split('T')[0],
        themeColor: school.settings?.themeColor || '#3b82f6',
        description: school.settings?.description || ''
      });
    }
  };

  if (loading || !school) {
    return (
      <div className="flex justify-center p-12">
        <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  const renderSchoolField = (field, label, value, type = 'text', icon = null) => {
    const isEditing = editingField === field;
    return (
      <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100">
        {icon && <div className="mr-3 text-gray-400">{icon}</div>}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          {isEditing ? (
            <div className="flex items-center">
              {type === 'color' ? (
                <div className="flex items-center space-x-2 w-full">
                  <input
                    ref={editInputRef}
                    type="color"
                    value={schoolFormData[field]}
                    onChange={e => setSchoolFormData({...schoolFormData, [field]: e.target.value})}
                    className="h-8 w-8 cursor-pointer rounded"
                  />
                  <span className="text-sm font-mono text-gray-600">{schoolFormData[field]}</span>
                  <button onClick={handleUpdateSchool} className="ml-auto p-1 text-blue-600 bg-blue-50 rounded"><Save className="w-4 h-4"/></button>
                  <button onClick={() => setEditingField(null)} className="p-1 text-gray-500 bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                </div>
              ) : type === 'textarea' ? (
                <div className="flex flex-col w-full space-y-2">
                  <textarea
                    ref={editInputRef}
                    value={schoolFormData[field]}
                    onChange={e => setSchoolFormData({...schoolFormData, [field]: e.target.value})}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null); }}
                    className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button onClick={handleUpdateSchool} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Save</button>
                    <button onClick={() => setEditingField(null)} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center w-full space-x-2">
                  <input
                    ref={editInputRef}
                    type={type}
                    value={schoolFormData[field]}
                    onChange={e => setSchoolFormData({...schoolFormData, [field]: e.target.value})}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button onClick={handleUpdateSchool} className="p-1 text-blue-600 bg-blue-50 rounded"><Save className="w-4 h-4"/></button>
                </div>
              )}
            </div>
          ) : (
            <div className="font-medium flex items-center justify-between text-sm">
              <span className="truncate pr-4">
                {type === 'color' ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 rounded-full mr-2 shadow-sm" style={{ backgroundColor: value }}></span>
                    {value}
                  </span>
                ) : type === 'date' ? (
                  new Date(value).toLocaleDateString()
                ) : (
                  value || 'Not provided'
                )}
              </span>
              <button 
                onClick={() => setEditingField(field)}
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all shrink-0"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300 space-y-6">
      
      {/* Overview Card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden relative">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 w-full absolute top-0 left-0"></div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mr-4 shrink-0 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{school.name}</h1>
                <p className="text-sm text-gray-500 flex items-center mt-1 font-medium">
                  School Code: <span className="ml-1 text-gray-800 bg-gray-100 px-2 py-0.5 rounded font-mono">{school.code}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50/80 px-4 py-2 rounded-xl flex items-center border border-blue-100/50">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Users</p>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{school._count?.users || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">General Settings</h3>
              {renderSchoolField('name', 'School Name', school.name, 'text')}
              {renderSchoolField('description', 'Description', school.settings?.description, 'textarea')}
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</h3>
              {renderSchoolField('validUntil', 'Subscription Valid Until', school.validUntil, 'date', <Calendar className="w-4 h-4" />)}
              {renderSchoolField('themeColor', 'Brand Theme Color', school.settings?.themeColor, 'color')}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Section */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-bold text-gray-900">School Administrators</h2>
          </div>
          <button 
            onClick={() => setShowAddAdminModal(true)}
            className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all font-medium text-xs focus:ring-4 focus:ring-indigo-100"
          >
            <User className="w-3.5 h-3.5 mr-1.5" /> Add Admin
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500">
                <th className="py-3 px-6 font-medium">Admin Details</th>
                <th className="py-3 px-6 font-medium">ERP ID</th>
                <th className="py-3 px-6 font-medium">Contact</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">No administrators found for this school.</td>
                </tr>
              ) : (
                admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 font-semibold text-xs">
                          {admin.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{admin.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-gray-600 font-mono text-xs">{admin.erpId}</td>
                    <td className="py-3 px-6 text-gray-600">{admin.contactDetails || '-'}</td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setAdminFormData({ name: admin.name, contactDetails: admin.contactDetails || '', password: '' });
                          setShowEditAdminModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Admin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/50 rounded-3xl border border-red-100 overflow-hidden mt-12 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-1">Danger Zone</h3>
            <p className="text-sm text-red-700/80 max-w-2xl">
              Permanently delete this school and all of its associated data (users, fees, attendance, assignments, etc.). This action is irreversible and should only be performed if you are absolutely certain.
            </p>
          </div>
          <button 
            onClick={() => setShowDeleteSchoolConfirm(true)}
            className="flex items-center justify-center px-6 py-2.5 bg-red-600 text-white rounded-xl shadow-sm hover:bg-red-700 transition-all font-bold text-sm shrink-0 whitespace-nowrap focus:ring-4 focus:ring-red-100"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete School
          </button>
        </div>
      </div>

      {/* MODALS */}
      {showAddAdminModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Administrator</h2>
              <button onClick={() => setShowAddAdminModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={adminFormData.name} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details (Optional)</label>
                <input type="text" value={adminFormData.contactDetails} onChange={e => setAdminFormData({...adminFormData, contactDetails: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Phone or email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" value={adminFormData.password} onChange={e => setAdminFormData({...adminFormData, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="••••••••" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddAdminModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {showEditAdminModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Edit Administrator</h2>
              <button onClick={() => setShowEditAdminModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={adminFormData.name} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                <input type="text" value={adminFormData.contactDetails} onChange={e => setAdminFormData({...adminFormData, contactDetails: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <label className="block text-sm font-medium text-indigo-900 mb-1 flex items-center"><Key className="w-3.5 h-3.5 mr-1" /> Reset Password</label>
                <input type="password" value={adminFormData.password} onChange={e => setAdminFormData({...adminFormData, password: e.target.value})} className="w-full border border-indigo-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white" placeholder="Leave blank to keep unchanged" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditAdminModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Administrator"
        message={`Are you sure you want to delete ${selectedAdmin?.name}? This action cannot be undone and will permanently remove their access.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAdmin}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteSchoolConfirm}
        title="Delete Entire School"
        message={`CRITICAL WARNING: You are about to permanently delete ${school?.name} and ALL of its associated data. This includes every student, teacher, fee record, and assignment. THIS ACTION CANNOT BE UNDONE. Are you absolutely certain you wish to proceed?`}
        confirmText="Yes, Delete School"
        cancelText="No, Keep School"
        onConfirm={handleDeleteSchool}
        onCancel={() => setShowDeleteSchoolConfirm(false)}
      />

    </div>
  );
}
