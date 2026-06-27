import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { User, Phone, AlertCircle, School, Shield, Briefcase, BookOpen, Layers, Edit2, Save, Trash2, Camera, Star } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Profile() {
  const { user, fetchProfile, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Local state for edits
  const [formData, setFormData] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [previewPicUrl, setPreviewPicUrl] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Editing state for inline edits
  const [editingField, setEditingField] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        contactDetails: user.contactDetails || '',
        password: ''
      });
      setPreviewPicUrl(user.profilePicUrl);
    }
  }, [user]);

  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingField]);

  if (!user) {
    return (
      <div className="flex justify-center p-12">
        <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      setProfilePic(file);
      setPreviewPicUrl(URL.createObjectURL(file));
      
      const formDataToSend = new FormData();
      formDataToSend.append('profileImage', file);
      
      setIsSubmitting(true);
      try {
        await api.put(`/users/${user.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Profile picture updated successfully');
        fetchProfile();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update profile picture');
        setPreviewPicUrl(user.profilePicUrl);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const payload = {};
      if (formData.name !== user.name) payload.name = formData.name;
      if (formData.contactDetails !== user.contactDetails) payload.contactDetails = formData.contactDetails;
      if (formData.password) payload.password = formData.password;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to update");
        setIsSubmitting(false);
        return;
      }

      await api.put(`/users/${user.id}`, payload);
      toast.success('Profile updated successfully');
      setFormData({ ...formData, password: '' });
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineEditSubmit = () => {
    setEditingField(null);
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Account deleted successfully');
      setShowDeleteConfirm(false);
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
      setShowDeleteConfirm(false);
    }
  };

  const renderField = (label, fieldKey, value, icon = null, isEditable = false, type = 'text') => {
    const isEditing = editingField === fieldKey;

    return (
      <div className={`flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100`}>
        {icon && <div className="mr-3 text-gray-400">{icon}</div>}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          {isEditing ? (
            <div className="flex items-center">
              <input
                ref={editInputRef}
                type={type}
                name={fieldKey}
                value={formData[fieldKey]}
                onChange={handleInputChange}
                onBlur={handleInlineEditSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineEditSubmit();
                  if (e.key === 'Escape') {
                    setFormData({...formData, [fieldKey]: user[fieldKey] || ''});
                    setEditingField(null);
                  }
                }}
                className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${label.toLowerCase()}`}
                autoComplete="off"
              />
            </div>
          ) : (
            <div className="font-medium flex items-center justify-between">
              <span>{fieldKey === 'password' && !formData.password ? '••••••••' : (fieldKey === 'password' ? '••••••••' : (formData[fieldKey] || value || 'Not provided'))}</span>
              {isEditable && isAdmin && (
                <button 
                  onClick={() => setEditingField(fieldKey)}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
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
                <div 
                  className={`w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden ${previewPicUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                  onClick={() => previewPicUrl && setShowImageModal(true)}
                >
                  {previewPicUrl ? (
                    <img src={previewPicUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
              </div>
              
              {isAdmin && (
                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors z-10 border-2 border-white">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                </label>
              )}
            </div>
          </div>

          <div className="flex sm:justify-end pt-20 sm:pt-4 pb-4 sm:pb-8">
            {!isAdmin ? (
              <div className="inline-flex items-center px-3 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs sm:text-sm font-medium">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Please contact your school administrator to update your profile details.</span>
              </div>
            ) : (
              user.isPrimary && (
                <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 text-yellow-800 rounded-full border border-yellow-200 shadow-sm text-xs font-semibold tracking-wide">
                  <Star className="w-4 h-4 mr-1.5 text-yellow-600 fill-current" />
                  PRIMARY ADMIN
                </div>
              )
            )}
          </div>

          {/* User Info */}
          <div className="mt-2 sm:mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-base sm:text-lg text-gray-500 font-medium capitalize mt-1">
              {user.role.replace('_', ' ')}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
                <div className="space-y-3">
                  {renderField('ERP ID', 'erpId', user.erpId, <User className="w-5 h-5" />, false)}
                  
                  {user.schoolName && (
                    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <School className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">School & Code</p>
                        <p className="font-medium text-gray-800">{user.schoolName} ({user.schoolCode || 'N/A'})</p>
                      </div>
                    </div>
                  )}

                  {renderField('Role', 'role', user.role.replace('_', ' '), <Shield className="w-5 h-5" />, false)}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact & Profile</h3>
                <div className="space-y-3">
                  {renderField('Name', 'name', user.name, <User className="w-5 h-5" />, true)}
                  {renderField('Phone / Contact', 'contactDetails', user.contactDetails, <Phone className="w-5 h-5" />, true)}
                  {isAdmin && renderField('Password', 'password', null, <Shield className="w-5 h-5" />, true, 'password')}
                  
                  {user.role === 'TEACHER' && (
                    <>
                      {renderField('Designation', 'designation', user.teacherProfile?.designation || 'Teacher', <Briefcase className="w-5 h-5" />, false)}
                      
                      <div className="flex items-start text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <Layers className="w-5 h-5 mr-3 text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Assigned Sections</p>
                          <div className="font-medium">
                            {user.teacherProfile?.assignedSections?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.teacherProfile.assignedSections.map(s => (
                                  <span key={s.id} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
                                    {s.class?.name}-{s.name}
                                  </span>
                                ))}
                              </div>
                            ) : 'None'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {user.role === 'STUDENT' && (
                    <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <BookOpen className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Class & Section</p>
                        <p className="font-medium text-gray-800">
                          {user.studentProfile?.section ? 
                            `${user.studentProfile.section.class?.name || 'Unknown'} - ${user.studentProfile.section.name}` : 
                            'Not assigned'}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
          
          {isAdmin && (
            <div className="mt-12 flex justify-end items-center pt-6 border-t border-gray-100">
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
          )}
          
          {isAdmin && !user.isPrimary && (
            <div className="mt-8 pt-6 border-t border-red-100">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" /> Danger Zone
              </h3>
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-red-900 text-sm">Delete Account</h4>
                  <p className="text-xs text-red-700 mt-1">Permanently delete your admin account and all associated data. This action cannot be undone.</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure you want to permanently delete your admin account? You will be logged out immediately."
        confirmText="Yes, delete my account"
        confirmColor="red"
      />

      {showImageModal && previewPicUrl && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-5xl w-full flex justify-center animate-in zoom-in duration-200">
            <img 
              src={previewPicUrl} 
              alt="Profile Preview" 
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
