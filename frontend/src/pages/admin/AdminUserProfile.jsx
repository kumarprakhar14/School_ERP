import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { User, Phone, AlertCircle, Edit2, Camera, Trash2, Save, School, Shield, Briefcase, BookOpen, Layers } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [classes, setClasses] = useState([]);
  
  // Local state for edits
  const [formData, setFormData] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [previewPicUrl, setPreviewPicUrl] = useState(null);

  // Editing state for inline edits
  const [editingField, setEditingField] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchClasses();
  }, [id]);

  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingField]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    }
  };

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
      
      // Initialize form data
      const initialData = {
        name: res.data.name || '',
        contactDetails: res.data.contactDetails || '',
        role: res.data.role || '',
      };
      
      if (res.data.role === 'TEACHER' && res.data.teacherProfile) {
        initialData.designation = res.data.teacherProfile.designation || '';
        initialData.teacherSectionIds = res.data.teacherProfile.teacherAssignments?.map(a => a.sectionId) || [];
      } else if (res.data.role === 'STUDENT' && res.data.studentProfile) {
        initialData.classId = res.data.studentProfile.section?.classId || '';
        initialData.sectionId = res.data.studentProfile.sectionId || '';
      }
      
      setFormData(initialData);
      setPreviewPicUrl(res.data.profilePicUrl);
    } catch (error) {
      toast.error('Failed to fetch user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('erpId', user.erpId);
      formDataToSend.append('role', formData.role);
      
      const profileData = {};
      if (formData.role === 'TEACHER') {
        profileData.designation = formData.designation;
        profileData.assignedSectionIds = formData.teacherSectionIds?.length > 0 ? formData.teacherSectionIds : undefined;
      } else if (formData.role === 'STUDENT') {
        profileData.sectionId = formData.sectionId || undefined;
      }
      
      formDataToSend.append('profileData', JSON.stringify(profileData));
      
      if (formData.contactDetails !== undefined) {
        formDataToSend.append('contactDetails', formData.contactDetails);
      }
      
      if (profilePic) {
        formDataToSend.append('profilePic', profilePic);
      }

      await api.put(`/users/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('User updated successfully');
      fetchUser(); // Refresh data to get newly uploaded image url etc.
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLifecycleAction = async (action) => {
    try {
      await api.patch(`/users/${id}/${action}`);
      toast.success(`User ${action}d successfully`);
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleInlineEditSubmit = () => {
    setEditingField(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInlineEditSubmit();
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center p-12">
        <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  const renderEditableField = (field, label, value, type = 'text', icon = null) => {
    const isEditing = editingField === field;
    
    return (
      <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100">
        {icon && <div className="mr-3 text-gray-400">{icon}</div>}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          {isEditing ? (
            <div className="flex items-center">
              {type === 'select' && field === 'role' ? (
                <select 
                  ref={editInputRef}
                  value={formData[field]} 
                  onChange={e => setFormData({...formData, [field]: e.target.value})}
                  onBlur={handleInlineEditSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTS">Accounts</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <input
                  ref={editInputRef}
                  type={type}
                  value={formData[field]}
                  onChange={e => setFormData({...formData, [field]: e.target.value})}
                  onBlur={handleInlineEditSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ) : (
            <div className="font-medium flex items-center justify-between">
              <span>{value || 'Not provided'}</span>
              <button 
                onClick={() => setEditingField(field)}
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="px-8 pb-8 relative">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
                <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden">
                  {previewPicUrl ? (
                    <img src={previewPicUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md hover:bg-blue-700 transition-colors border-2 border-white z-10">
                <Camera className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  if (e.target.files[0]) {
                    setProfilePic(e.target.files[0]);
                    setPreviewPicUrl(URL.createObjectURL(e.target.files[0]));
                  }
                }} />
              </label>
            </div>
          </div>

          <div className="flex sm:justify-end pt-20 sm:pt-4 pb-4 sm:pb-8">
            <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-xs sm:text-sm font-medium">
              <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Admin Mode: You can edit this user's details inline.</span>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-2 sm:mt-4 max-w-lg">
            {editingField === 'name' ? (
              <input
                ref={editInputRef}
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                onBlur={handleInlineEditSubmit}
                onKeyDown={handleKeyDown}
                className="text-2xl sm:text-3xl font-bold text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 w-full mb-1"
              />
            ) : (
              <div className="flex items-center group flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mr-3">{formData.name}</h1>
                {user.role === 'ADMIN' && user.isPrimary && (
                  <span className="mr-3 inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-bold">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Primary
                  </span>
                )}
                {user.isArchived ? (
                  <span className="mr-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">Archived</span>
                ) : !user.isActive ? (
                  <span className="mr-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">Disabled</span>
                ) : (
                  <span className="mr-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-600 border border-green-100 uppercase tracking-wider">Active</span>
                )}
                <button 
                  onClick={() => setEditingField('name')}
                  className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <p className="text-base sm:text-lg text-gray-500 font-medium capitalize mt-1">
              {formData.role.replace('_', ' ')}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <User className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ERP ID (Read-only)</p>
                      <p className="font-medium text-gray-500">{user.erpId}</p>
                    </div>
                  </div>

                  {user.school && (
                    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <School className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">School & Code (Read-only)</p>
                        <p className="font-medium text-gray-500">{user.school.name} ({user.school.code})</p>
                      </div>
                    </div>
                  )}

                  {renderEditableField('role', 'Role', formData.role, 'select', <Shield className="w-5 h-5" />)}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact & Profile</h3>
                <div className="space-y-3">
                  {renderEditableField('contactDetails', 'Phone / Contact', formData.contactDetails, 'text', <Phone className="w-5 h-5" />)}
                  
                  {formData.role === 'TEACHER' && (
                    <>
                      {renderEditableField('designation', 'Designation', formData.designation, 'text', <Briefcase className="w-5 h-5" />)}
                      
                      {/* Special handling for assigned sections inline edit */}
                      <div className="flex items-start text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100">
                        <Layers className="w-5 h-5 mr-3 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 mb-1">Assigned Sections</p>
                            <button 
                              onClick={() => setEditingField(editingField === 'sections' ? null : 'sections')}
                              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {editingField === 'sections' ? (
                            <select 
                              multiple 
                              value={formData.teacherSectionIds} 
                              onChange={e => {
                                const values = [...e.target.selectedOptions].map(o => o.value);
                                setFormData({...formData, teacherSectionIds: values});
                              }}
                              className="w-full bg-white border border-blue-300 rounded px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 h-32 mt-2"
                            >
                              {classes.map(cls => (
                                <optgroup key={cls.id} label={`Class ${cls.name}`}>
                                  {cls.sections?.map(sec => (
                                    <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : (
                            <div className="font-medium mt-1">
                              {formData.teacherSectionIds?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {formData.teacherSectionIds.map(id => {
                                    // Find section name
                                    let secName = '';
                                    classes.forEach(c => {
                                      const s = c.sections?.find(sec => sec.id === id);
                                      if (s) secName = `${c.name}-${s.name}`;
                                    });
                                    return <span key={id} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{secName || id}</span>;
                                  })}
                                </div>
                              ) : 'None'}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {formData.role === 'STUDENT' && (
                    <div className="flex items-start text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100">
                      <BookOpen className="w-5 h-5 mr-3 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 mb-1">Class & Section</p>
                          <button 
                            onClick={() => setEditingField(editingField === 'studentClass' ? null : 'studentClass')}
                            className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {editingField === 'studentClass' ? (
                          <div className="flex space-x-2 mt-2">
                            <select 
                              value={formData.classId || ''} 
                              onChange={e => setFormData({...formData, classId: e.target.value, sectionId: ''})} 
                              className="w-1/2 border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Class</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select 
                              value={formData.sectionId || ''} 
                              onChange={e => setFormData({...formData, sectionId: e.target.value})} 
                              className="w-1/2 border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!formData.classId}
                            >
                              <option value="">Section</option>
                              {formData.classId && classes.find(c => c.id === formData.classId)?.sections?.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="font-medium mt-1">
                            {formData.classId ? (
                              <span>
                                {classes.find(c => c.id === formData.classId)?.name || 'Unknown'} 
                                {formData.sectionId && ` - ${classes.find(c => c.id === formData.classId)?.sections?.find(s => s.id === formData.sectionId)?.name || 'Unknown'}`}
                              </span>
                            ) : 'Not assigned'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-100 gap-4">
            <div className="flex space-x-3">
              {!user.isPrimary && (
                <>
                  {user.isArchived ? (
                    <button 
                      onClick={() => handleLifecycleAction('restore')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium border border-gray-200 text-sm"
                    >
                      Restore User
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLifecycleAction('archive')}
                      className="px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium border border-gray-300 text-sm"
                    >
                      Archive User
                    </button>
                  )}

                  {!user.isArchived && (
                    user.isActive ? (
                      <button 
                        onClick={() => handleLifecycleAction('disable')}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium border border-red-200 text-sm"
                      >
                        Disable User
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleLifecycleAction('enable')}
                        className="px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-medium border border-green-200 text-sm"
                      >
                        Enable User
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            <button 
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Profile
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
