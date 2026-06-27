import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { User, Phone, Edit2, Camera, Save, Shield, Calendar, Activity, Database, Clock, Star, Trash2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function SuperAdminProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const id = authUser?.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    if (id) {
      fetchUser();
    }
  }, [id]);

  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingField]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
      
      // Initialize form data with all available schema fields (empty string if null/undefined)
      setFormData({
        name: res.data.name || '',
        contactDetails: res.data.contactDetails || '',
        erpId: res.data.erpId || '',
        password: '' // New password field
      });
      setPreviewPicUrl(res.data.profilePicUrl);
    } catch (error) {
      toast.error('Failed to fetch user details');
      navigate('/super-admin/schools');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('erpId', formData.erpId);
      
      if (formData.password) {
        formDataToSend.append('password', formData.password);
      }
      
      if (formData.contactDetails !== undefined) {
        formDataToSend.append('contactDetails', formData.contactDetails);
      }
      
      if (profilePic) {
        formDataToSend.append('profilePic', profilePic);
      }

      await api.put(`/users/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Super Admin profile updated successfully');
      setFormData(prev => ({...prev, password: ''})); // clear password
      fetchUser(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('Account deleted successfully');
      useAuthStore.getState().logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
      setShowDeleteConfirm(false);
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

  const renderEditableField = (field, label, value, type = 'text', icon = null, placeholder = 'Not provided') => {
    const isEditing = editingField === field;
    
    return (
      <div className="flex items-center text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-100 group transition-all hover:bg-gray-100">
        {icon && <div className="mr-3 text-gray-400">{icon}</div>}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          {isEditing ? (
            <div className="flex items-center">
              <input
                ref={editInputRef}
                type={type}
                value={formData[field]}
                onChange={e => setFormData({...formData, [field]: e.target.value})}
                onBlur={handleInlineEditSubmit}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="font-medium flex items-center justify-between">
              <span>{value || placeholder}</span>
              <button 
                onClick={() => setEditingField(field)}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReadOnlyField = (label, value, icon = null) => (
    <div className="flex items-center text-gray-700 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
      {icon && <div className="mr-3 text-gray-400">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="font-medium text-gray-500">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-700"></div>
        
        <div className="px-8 pb-8 relative">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
                <div 
                  className={`w-full h-full bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden ${previewPicUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                  onClick={() => previewPicUrl && setShowImageModal(true)}
                >
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
            <div className="inline-flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 text-xs sm:text-sm font-medium">
              <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Super Admin Profile</span>
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
                placeholder="Full Name"
              />
            ) : (
              <div className="flex items-center group">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mr-3">{formData.name || 'Not provided'}</h1>
                <button 
                  onClick={() => setEditingField('name')}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex items-center mt-1">
              <p className="text-base sm:text-lg text-gray-500 font-medium capitalize mr-3">
                Super Administrator
              </p>
              {user.isPrimary && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Star className="w-3 h-3 mr-1 fill-amber-500" /> Primary
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Editable Profile Details</h3>
                <div className="space-y-3">
                  {renderEditableField('contactDetails', 'Contact Details', formData.contactDetails, 'text', <Phone className="w-5 h-5" />, 'Phone number or address')}
                  {renderEditableField('password', 'New Password', formData.password ? '••••••••' : '', 'password', <Shield className="w-5 h-5" />, 'Leave blank to keep unchanged')}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">System Attributes</h3>
                <div className="space-y-3">
                  {renderEditableField('erpId', 'ERP ID', formData.erpId, 'text', <User className="w-5 h-5" />)}
                  {renderReadOnlyField('Role', user.role, <Shield className="w-5 h-5" />)}
                  {renderReadOnlyField('Internal ID', user.id, <Database className="w-5 h-5" />)}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">System Meta (Read-Only)</h3>
                <div className="space-y-3">
                  {renderReadOnlyField('Account Status', user.isActive ? 'Active' : 'Inactive', <Activity className="w-5 h-5" />)}
                  {renderReadOnlyField('Archived', user.isArchived ? 'Yes' : 'No', <Database className="w-5 h-5" />)}
                  {renderReadOnlyField('Created At', new Date(user.createdAt).toLocaleString(), <Calendar className="w-5 h-5" />)}
                  {renderReadOnlyField('Last Updated At', new Date(user.updatedAt).toLocaleString(), <Clock className="w-5 h-5" />)}
                </div>
              </div>
            </div>
          </div>

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
              Save Changes
            </button>
          </div>

          {!user.isPrimary && (
            <div className="mt-8 bg-red-50/50 rounded-2xl border border-red-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Danger Zone</h3>
                <p className="text-sm text-red-700/80">
                  Permanently delete your Super Admin account. You will be logged out immediately.
                </p>
              </div>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl shadow-sm hover:bg-red-700 transition-all font-medium text-sm shrink-0 focus:ring-4 focus:ring-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </button>
            </div>
          )}

        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Your Account"
        message="WARNING: You are about to permanently delete your own account. This action cannot be undone and you will lose access immediately. Are you absolutely certain you wish to proceed?"
        confirmText="Yes, Delete My Account"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
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
