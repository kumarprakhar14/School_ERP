import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import { User, Phone, BookOpen, AlertCircle, Edit2, X, Camera } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactDetails: ''
  });
  const [profilePic, setProfilePic] = useState(null);

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleEditClick = () => {
    setFormData({
      name: user.name || '',
      contactDetails: user.contactDetails || ''
    });
    setProfilePic(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('contactDetails', formData.contactDetails);
      if (profilePic) {
        data.append('profilePic', profilePic);
      }
      
      const res = await api.put(`/users/${user.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUser({ ...user, ...res.data, profilePicUrl: res.data.profilePicUrl || user.profilePicUrl });
      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="px-8 pb-8 relative">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-8">
            <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
              <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600">
                {user.profilePicUrl ? (
                  <img src={user.profilePicUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:justify-end pt-20 sm:pt-4 pb-4 sm:pb-8">
            {user.role === 'ADMIN' ? (
              <button 
                onClick={handleEditClick}
                className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium shadow-sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="inline-flex items-center px-3 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs sm:text-sm font-medium">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Please contact the admin to update your profile details.</span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="mt-2 sm:mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-base sm:text-lg text-gray-500 font-medium capitalize mt-1">{user.role.replace('_', ' ')}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Account Details</h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                  <div className="flex items-center text-gray-700">
                    <User className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ERP ID</p>
                      <p className="font-medium">{user.erpId}</p>
                    </div>
                  </div>
                  {user.schoolId && (
                    <div className="flex items-center text-gray-700">
                      <BookOpen className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">School ID</p>
                        <p className="font-medium">{user.schoolId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone / Contact</p>
                      <p className="font-medium">{user.contactDetails || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                    {profilePic ? (
                      <img src={URL.createObjectURL(profilePic)} alt="Preview" className="w-full h-full object-cover" />
                    ) : user.profilePicUrl ? (
                      <img src={user.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md hover:bg-blue-700 transition-colors border-2 border-white">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files[0]) setProfilePic(e.target.files[0]);
                    }} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                <input type="text" value={formData.contactDetails} onChange={e => setFormData({...formData, contactDetails: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. +1 234 567 8900" />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Save Changes'}
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
