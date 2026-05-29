import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { UserPlus, Users as UsersIcon, User, X } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // stores user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', erpId: '', password: '', role: 'STUDENT',
    designation: '', sectionId: '', classId: '', teacherSectionIds: []
  });

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, [filter]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users${filter ? `?role=${filter}` : ''}`);
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        erpId: formData.erpId,
        password: formData.password || undefined,
        role: formData.role,
        profileData: {
          designation: formData.designation,
          sectionId: formData.sectionId || undefined,
          assignedSectionIds: formData.teacherSectionIds.length > 0 ? formData.teacherSectionIds : undefined
        }
      };
      await api.post('/users', payload);
      setShowAddModal(false);
      setFormData({ name: '', erpId: '', password: '', role: 'STUDENT', designation: '', sectionId: '', classId: '', teacherSectionIds: [] });
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user', error);
      alert(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', showEditModal.name);
      formDataToSend.append('erpId', showEditModal.erpId);
      if (showEditModal.password) formDataToSend.append('password', showEditModal.password);
      formDataToSend.append('role', showEditModal.role);
      
      const profileData = {
        designation: showEditModal.designation,
        sectionId: showEditModal.sectionId || undefined,
        assignedSectionIds: showEditModal.teacherSectionIds?.length > 0 ? showEditModal.teacherSectionIds : undefined
      };
      formDataToSend.append('profileData', JSON.stringify(profileData));
      
      if (showEditModal.contactDetails !== undefined) {
        formDataToSend.append('contactDetails', showEditModal.contactDetails);
      }
      
      if (showEditModal.profilePic) {
        formDataToSend.append('profilePic', showEditModal.profilePic);
      }

      await api.put(`/users/${showEditModal.id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowEditModal(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user', error);
      alert(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'TEACHER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ACCOUNTS': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'STUDENT': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-indigo-200/50">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage teachers, students, and staff</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm focus:ring-4 focus:ring-blue-200"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex space-x-2 bg-gray-50/50">
          {['', 'TEACHER', 'STUDENT', 'ACCOUNTS'].map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === role 
                  ? 'bg-white shadow-sm border border-gray-200 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {role || 'ALL'}
            </button>
          ))}
        </div>
        
        {loading ? (
           <div className="flex justify-center p-12">
            <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">ERP ID</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Details</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-mono bg-gray-50/50 rounded-lg inline-block mt-2 mb-2 ml-2">{user.erpId}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {user.role === 'TEACHER' && user.teacherProfile?.designation}
                      {user.role === 'STUDENT' && user.studentProfile && 'Student Profile'}
                      {user.role === 'ACCOUNTS' && 'Accounts Staff'}
                      {user.role === 'ADMIN' && 'Administrator'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => {
                        const editData = { ...user, password: '' };
                        if (user.role === 'TEACHER' && user.teacherProfile) {
                          editData.designation = user.teacherProfile.designation || '';
                          editData.teacherSectionIds = user.teacherProfile.assignedSections?.map(s => s.id) || [];
                        } else if (user.role === 'STUDENT' && user.studentProfile) {
                          editData.sectionId = user.studentProfile.sectionId || '';
                          editData.classId = user.studentProfile.section?.classId || '';
                        }
                        editData.contactDetails = user.contactDetails || '';
                        editData.profilePicUrl = user.profilePicUrl || '';
                        setShowEditModal(editData);
                      }} className="text-blue-500 hover:text-blue-700 text-xs font-medium mr-3">Edit</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ERP ID</label>
                  <input required type="text" value={formData.erpId} onChange={e => setFormData({...formData, erpId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="STU002" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(Default: password123)" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTS">Accounts</option>
                </select>
              </div>
              
              {formData.role === 'TEACHER' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">Designation</label>
                    <input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full border border-emerald-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="e.g. Science Teacher" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">Assign Sections (Hold Ctrl/Cmd to select multiple)</label>
                    <select multiple value={formData.teacherSectionIds} onChange={e => {
                      const options = [...e.target.selectedOptions];
                      const values = options.map(option => option.value);
                      setFormData({...formData, teacherSectionIds: values});
                    }} className="w-full border border-emerald-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white h-24">
                      {classes.map(cls => (
                        <optgroup key={cls.id} label={`Class ${cls.name}`}>
                          {cls.sections?.map(sec => (
                            <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.role === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Class</label>
                    <select value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value, sectionId: ''})} className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">Select Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Section</label>
                    <select value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})} className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" disabled={!formData.classId}>
                      <option value="">Select Section...</option>
                      {formData.classId && classes.find(c => c.id === formData.classId)?.sections?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
              <button onClick={() => setShowEditModal(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={showEditModal.name} onChange={e => setShowEditModal({...showEditModal, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ERP ID</label>
                  <input required type="text" value={showEditModal.erpId} onChange={e => setShowEditModal({...showEditModal, erpId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={showEditModal.password} onChange={e => setShowEditModal({...showEditModal, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(Leave blank to keep)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                  <input type="text" value={showEditModal.contactDetails || ''} onChange={e => setShowEditModal({...showEditModal, contactDetails: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone or Address" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                  <input type="file" accept="image/*" onChange={e => setShowEditModal({...showEditModal, profilePic: e.target.files[0]})} className="w-full border border-gray-200 rounded-xl p-1.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none" />
                </div>
              </div>
              
              {showEditModal.role === 'TEACHER' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">Designation</label>
                    <input type="text" value={showEditModal.designation || ''} onChange={e => setShowEditModal({...showEditModal, designation: e.target.value})} className="w-full border border-emerald-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="e.g. Science Teacher" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">Assign Sections (Hold Ctrl/Cmd to select multiple)</label>
                    <select multiple value={showEditModal.teacherSectionIds || []} onChange={e => {
                      const options = [...e.target.selectedOptions];
                      const values = options.map(option => option.value);
                      setShowEditModal({...showEditModal, teacherSectionIds: values});
                    }} className="w-full border border-emerald-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white h-24">
                      {classes.map(cls => (
                        <optgroup key={cls.id} label={`Class ${cls.name}`}>
                          {cls.sections?.map(sec => (
                            <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {showEditModal.role === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Class</label>
                    <select value={showEditModal.classId || ''} onChange={e => setShowEditModal({...showEditModal, classId: e.target.value, sectionId: ''})} className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">Select Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Section</label>
                    <select value={showEditModal.sectionId || ''} onChange={e => setShowEditModal({...showEditModal, sectionId: e.target.value})} className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" disabled={!showEditModal.classId}>
                      <option value="">Select Section...</option>
                      {showEditModal.classId && classes.find(c => c.id === showEditModal.classId)?.sections?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowEditModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
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
