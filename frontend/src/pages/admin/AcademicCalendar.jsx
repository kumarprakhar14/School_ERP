import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import academicCalendarApi from '../../services/api/academicCalendar';
import { Calendar, Plus, Edit2, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ResponsiveTable from '../../components/ui/ResponsiveTable';

export default function AcademicCalendar() {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    status: 'WORKING',
    reason: ''
  });

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState(null);

  useEffect(() => {
    fetchOverrides();
  }, [filterMonth]);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      let filters = {};
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        filters.startDate = `${year}-${month}-01`;
        // Rough end date for the month
        const nextMonth = new Date(year, month, 1);
        filters.endDate = nextMonth.toISOString().split('T')[0];
      }
      
      const res = await academicCalendarApi.listOverrides(filters);
      setOverrides(res.data || []);
    } catch (error) {
      console.error('Failed to fetch overrides', error);
      toast.error('Failed to load academic calendar');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      startDate: '',
      endDate: '',
      status: 'WORKING',
      reason: ''
    });
    setEditMode(false);
    setCurrentId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (override) => {
    setFormData({
      startDate: override.startDate.split('T')[0],
      endDate: override.endDate.split('T')[0],
      status: override.status,
      reason: override.reason || ''
    });
    setCurrentId(override.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      
      // Auto-set endDate to startDate for WORKING/HOLIDAY if not provided or to ensure they match
      if (payload.status === 'WORKING' || payload.status === 'HOLIDAY') {
        payload.endDate = payload.startDate;
      }

      // Convert to ISO string for backend Zod validation
      payload.startDate = new Date(payload.startDate).toISOString();
      payload.endDate = new Date(payload.endDate).toISOString();

      if (editMode) {
        await academicCalendarApi.updateOverride(currentId, payload);
        toast.success('Calendar override updated successfully');
      } else {
        await academicCalendarApi.createOverride(payload);
        toast.success('Calendar override created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchOverrides();
    } catch (error) {
      console.error('Failed to save override', error);
      const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Failed to save calendar override';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (override) => {
    setSelectedToDelete(override);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await academicCalendarApi.deleteOverride(selectedToDelete.id);
      toast.success('Calendar override deleted successfully');
      fetchOverrides();
    } catch (error) {
      toast.error('Failed to delete override');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setSelectedToDelete(null);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      WORKING: 'bg-green-100 text-green-800 border-green-200',
      HOLIDAY: 'bg-red-100 text-red-800 border-red-200',
      VACATION: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const columns = [
    { 
      header: 'Start Date', 
      render: (row) => new Date(row.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
    },
    { 
      header: 'End Date', 
      render: (row) => new Date(row.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
    },
    { 
      header: 'Status', 
      render: (row) => getStatusBadge(row.status) 
    },
    { 
      header: 'Reason', 
      render: (row) => row.reason || <span className="text-gray-400 italic">No reason provided</span> 
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEditModal(row)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit Override"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDeleteClick(row)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete Override"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Academic Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage school holidays, vacations, and special working days.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            onClick={openAddModal}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Override
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">How the calendar works</p>
          <p className="opacity-90">By default, every Monday to Saturday is a <strong>Working Day</strong>, and every Sunday is a <strong>Holiday</strong>. You only need to add an override here if you want to change this default behavior (e.g., adding a special festival holiday, a summer vacation, or making a specific Sunday a working day).</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <ResponsiveTable 
          columns={columns}
          data={overrides}
          loading={loading}
          emptyMessage="No calendar overrides found."
          keyExtractor={(row) => row.id}
          renderMobileCard={(row) => (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {new Date(row.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} 
                    {row.startDate !== row.endDate && ` - ${new Date(row.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{row.reason || 'No reason provided'}</div>
                </div>
                {getStatusBadge(row.status)}
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? 'Edit Override' : 'Add Override'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Type</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="WORKING">Working Day</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="VACATION">Vacation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.status === 'VACATION' ? formData.endDate : formData.startDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                    disabled={formData.status !== 'VACATION'}
                    min={formData.startDate}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason / Occasion {['HOLIDAY', 'VACATION'].includes(formData.status) && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={formData.status === 'WORKING' ? 'Optional reason...' : 'e.g., Summer Vacation, Diwali'}
                  required={['HOLIDAY', 'VACATION'].includes(formData.status)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Save Override'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => !isSubmitting && setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Calendar Override"
        message={`Are you sure you want to delete the override for ${selectedToDelete?.reason || 'this date range'}? The affected dates will revert to their default status.`}
        confirmText="Delete Override"
        isDanger={true}
        isLoading={isSubmitting}
      />
    </div>
  );
}
