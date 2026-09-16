import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { Shield, User, X, Trash2, Key, Star, ShieldAlert } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useAuthStore from '../../store/authStore';
import ResponsiveTable from '../../components/ui/ResponsiveTable';

export default function SuperAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrimaryConfirm, setShowPrimaryConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', password: '', contactDetails: '' });

  useEffect(() => {
    fetchAdmins(page);
  }, [page]);

  const fetchAdmins = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await api.get(`/users?role=SUPER_ADMIN&page=${pageNum}&limit=20`);
      // Since getUsers uses unwrapped pagination
      const { data, pagination } = res.data;
      if (pageNum === 1) {
        setAdmins(data || []);
      } else {
        setAdmins(prev => [...prev, ...(data || [])]);
      }
      setHasMore(pageNum < (pagination?.totalPages || 1));
      
      // Update local storage user if their status changed
      const updatedMe = (data || []).find(a => a.id === currentUser.id);
      if (updatedMe && currentUser.isPrimary !== updatedMe.isPrimary) {
        useAuthStore.setState({ user: { ...currentUser, isPrimary: updatedMe.isPrimary } });
      }
    } catch (error) {
      toast.error('Failed to load administrators');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        ...formData,
        role: 'SUPER_ADMIN'
      });
      toast.success('Super Admin created successfully');
      setShowAddModal(false);
      setFormData({ name: '', password: '', contactDetails: '' });
      if (page === 1) fetchAdmins(1);
      else setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${selectedAdmin.id}`);
      toast.success('Administrator deleted successfully');
      setShowDeleteConfirm(false);
      
      if (selectedAdmin.id === currentUser.id) {
        useAuthStore.getState().logout();
      } else {
        if (page === 1) fetchAdmins(1);
        else setPage(1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete administrator');
      setShowDeleteConfirm(false);
    }
  };

  const handleMakePrimary = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/users/${selectedAdmin.id}`, { isPrimary: true });
      toast.success(`${selectedAdmin.name} is now the Primary Super Admin`);
      setShowPrimaryConfirm(false);
      if (page === 1) fetchAdmins(1);
      else setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to transfer primary status');
      setShowPrimaryConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldAlert className="w-6 h-6 text-indigo-600 mr-2" />
            Super Administrators
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage global system administrators and root access</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-all font-medium text-sm focus:ring-4 focus:ring-indigo-100"
        >
          <User className="w-4 h-4 mr-2" /> Add Super Admin
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
            </div>
          ) : (
            <ResponsiveTable
              data={admins}
              hasMore={hasMore}
              onLoadMore={() => setPage(p => p + 1)}
              keyExtractor={(admin) => admin.id}
              emptyMessage="No administrators found."
              emptyIcon={ShieldAlert}
              columns={[
                {
                  header: 'Administrator',
                  render: (admin) => {
                    const isMe = admin.id === currentUser.id;
                    return (
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 font-bold text-sm ${admin.isPrimary ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{admin.name} {isMe && <span className="text-xs text-gray-400 font-normal ml-1">(You)</span>}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5 block">{admin.erpId}</span>
                        </div>
                      </div>
                    );
                  }
                },
                {
                  header: 'Status',
                  render: (admin) => (
                    admin.isPrimary ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-amber-500" /> Primary
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Regular
                      </span>
                    )
                  )
                },
                {
                  header: 'Contact',
                  render: (admin) => <span className="text-gray-600">{admin.contactDetails || '-'}</span>
                },
                {
                  header: 'Actions',
                  align: 'right',
                  render: (admin) => {
                    const isMe = admin.id === currentUser.id;
                    const amIPrimary = currentUser.isPrimary;
                    return (
                      <div className="space-x-2">
                        {amIPrimary && !admin.isPrimary && (
                          <button 
                            onClick={() => { setSelectedAdmin(admin); setShowPrimaryConfirm(true); }}
                            className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 font-medium mr-2"
                          >
                            Make Primary
                          </button>
                        )}
                        {!admin.isPrimary && (
                          <button 
                            onClick={() => { setSelectedAdmin(admin); setShowDeleteConfirm(true); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={isMe ? "Delete My Account" : "Delete Admin"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  }
                }
              ]}
              renderMobileCard={(admin) => {
                const isMe = admin.id === currentUser.id;
                const amIPrimary = currentUser.isPrimary;
                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 font-bold text-sm ${admin.isPrimary ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{admin.name} {isMe && <span className="text-xs text-gray-400 font-normal ml-1">(You)</span>}</span>
                          <span className="text-xs text-gray-500 font-mono mt-0.5 block">{admin.erpId}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {amIPrimary && !admin.isPrimary && (
                          <button 
                            onClick={() => { setSelectedAdmin(admin); setShowPrimaryConfirm(true); }}
                            className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 font-medium"
                          >
                            Make Primary
                          </button>
                        )}
                        {!admin.isPrimary && (
                          <button 
                            onClick={() => { setSelectedAdmin(admin); setShowDeleteConfirm(true); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={isMe ? "Delete My Account" : "Delete Admin"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">Status</span>
                        {admin.isPrimary ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="w-3 h-3 mr-1 fill-amber-500" /> Primary
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            Regular
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">Contact</span>
                        <span className="text-gray-600">{admin.contactDetails || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Add Super Admin</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details (Optional)</label>
                <input type="text" value={formData.contactDetails} onChange={e => setFormData({...formData, contactDetails: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={selectedAdmin?.id === currentUser.id ? "Delete Your Account" : "Delete Administrator"}
        message={selectedAdmin?.id === currentUser.id 
          ? `WARNING: You are about to permanently delete YOUR OWN account. You will be logged out immediately and will not be able to log back in. Proceed?` 
          : `Are you sure you want to delete ${selectedAdmin?.name}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showPrimaryConfirm}
        title="Transfer Primary Status"
        message={`WARNING: You are about to transfer the Primary Super Admin status to ${selectedAdmin?.name}. You will instantly lose your Primary privileges and become a regular Super Admin. You will not be able to undo this unless they transfer it back to you.`}
        confirmText="Yes, Transfer Status"
        cancelText="Cancel"
        onConfirm={handleMakePrimary}
        onCancel={() => setShowPrimaryConfirm(false)}
      />
    </div>
  );
}
