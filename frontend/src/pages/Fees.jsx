import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { DollarSign, CheckCircle, Clock, Plus, X, Search, AlertCircle, FileText } from 'lucide-react';

export default function Fees() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'history'
  const [feeSummary, setFeeSummary] = useState([]);
  const [feeHistory, setFeeHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchSummary, setSearchSummary] = useState('');
  const [searchHistory, setSearchHistory] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), remarks: '',
    status: 'PENDING', paymentMode: '', referenceNo: ''
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.get('/fees/summary'),
        api.get('/fees')
      ]);
      setFeeSummary(summaryRes.data);
      setFeeHistory(historyRes.data);
      
      if (user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') {
        const studentsRes = await api.get('/users?role=STUDENT');
        setStudents(studentsRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = (feeId) => {
    setPayTarget(feeId);
    setShowPayConfirm(true);
  };

  const handlePayConfirm = async () => {
    if (!payTarget) return;
    try {
      await api.put(`/fees/${payTarget}/pay`, { paymentMode: 'CASH' });
      toast.success('Transaction marked as Paid');
      fetchData(); // Cascade update
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setShowPayConfirm(false);
      setPayTarget(null);
    }
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees', formData);
      setShowAddModal(false);
      setFormData({ studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), remarks: '', status: 'PENDING', paymentMode: '', referenceNo: '' });
      fetchData(); // Cascade update
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create fee record');
    }
  };

  const filteredSummary = feeSummary.filter(f => 
    f.student?.name.toLowerCase().includes(searchSummary.toLowerCase()) || 
    f.student?.erpId.toLowerCase().includes(searchSummary.toLowerCase())
  );

  const filteredHistory = feeHistory.filter(f => 
    f.student?.name.toLowerCase().includes(searchHistory.toLowerCase()) || 
    f.student?.erpId.toLowerCase().includes(searchHistory.toLowerCase()) ||
    (f.referenceNo && f.referenceNo.toLowerCase().includes(searchHistory.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-sm border border-emerald-200/50">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Accounts & Fees</h1>
            <p className="text-sm text-gray-500 mt-1">Manage student fee records and transactions</p>
          </div>
        </div>
        
        {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && activeTab === 'history' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Transaction
          </button>
        )}
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'summary' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Student Fee Summary
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Transaction History
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <>
          {/* TAB A: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search student or ERP ID..." 
                    value={searchSummary}
                    onChange={(e) => setSearchSummary(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Student</th>
                        <th className="p-4">Class/Sec</th>
                        <th className="p-4">Total Billed</th>
                        <th className="p-4">Amount Due</th>
                        <th className="p-4">Due Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredSummary.map(summary => (
                        <tr key={summary.student.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{summary.student.name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{summary.student.erpId}</p>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{summary.student.classDetails}</td>
                          <td className="p-4 font-mono font-medium text-gray-600">₹{summary.totalAmount.toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-gray-900">₹{summary.dueAmount.toFixed(2)}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {summary.dueDate ? new Date(summary.dueDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4">
                            {summary.status === 'PAID' && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>}
                            {summary.status === 'PENDING' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100 flex w-fit items-center"><Clock className="w-3 h-3 mr-1"/> PENDING</span>}
                            {summary.status === 'OVERDUE' && <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100 flex w-fit items-center"><AlertCircle className="w-3 h-3 mr-1"/> OVERDUE</span>}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => { setSearchHistory(summary.student.erpId); setActiveTab('history'); }} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                              View History
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSummary.length === 0 && (
                        <tr><td colSpan="7" className="p-8 text-center text-gray-500">No students found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search student, ERP ID, or Ref No..." 
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Student</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Billing Month</th>
                        <th className="p-4">Status & Payment</th>
                        <th className="p-4">Remarks</th>
                        {user?.role === 'ACCOUNTS' && <th className="p-4">Added By</th>}
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredHistory.map(fee => (
                        <tr key={fee.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{fee.student?.name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{fee.student?.erpId}</p>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-700">${fee.amount.toFixed(2)}</td>
                          <td className="p-4 text-sm text-gray-600">{monthNames[fee.month - 1]} {fee.year}</td>
                          <td className="p-4">
                            <div className="flex flex-col space-y-1">
                              {fee.status === 'PAID' ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100 flex w-fit items-center"><Clock className="w-3 h-3 mr-1"/> PENDING</span>
                              )}
                              {fee.paymentMode && <span className="text-xs text-gray-500 font-medium">via {fee.paymentMode}</span>}
                              {fee.referenceNo && <span className="text-xs text-gray-400 font-mono">{fee.referenceNo}</span>}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{fee.remarks || '-'}</td>
                          {user?.role === 'ACCOUNTS' && (
                            <td className="p-4 text-sm text-gray-700 font-medium">{fee.creator?.name || 'System'}</td>
                          )}
                          <td className="p-4 text-right">
                            {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && fee.status !== 'PAID' && (
                              <button onClick={() => handlePayClick(fee.id)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-xl hover:bg-emerald-700 shadow-sm">
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredHistory.length === 0 && (
                        <tr><td colSpan="6" className="p-8 text-center text-gray-500">No transaction records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD TRANSACTION MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center"><FileText className="w-5 h-5 mr-2 text-emerald-600" /> Add Transaction</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateFee} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                  <select required value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="">Select Student...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.erpId})</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 150.00" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="PENDING">Bill / Fee Due (Pending)</option>
                    <option value="PAID">Receipt / Payment (Paid)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Month</label>
                  <select required value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Year</label>
                  <input required type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              {formData.status === 'PAID' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select required value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                      <option value="">Select Mode...</option>
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Online Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CARD">Credit/Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                    <input type="text" value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="(Optional)" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Tuition Fee, Exam Fee" />
              </div>
              
              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Pay Confirm Modal */}
      <ConfirmDialog
        isOpen={showPayConfirm}
        title="Mark as Paid"
        message="Are you sure you want to mark this transaction as Paid? This action will set the payment mode to Cash."
        confirmText="Mark Paid"
        cancelText="Cancel"
        isDestructive={false}
        onConfirm={handlePayConfirm}
        onCancel={() => {
          setShowPayConfirm(false);
          setPayTarget(null);
        }}
      />
    </div>
  );
}
