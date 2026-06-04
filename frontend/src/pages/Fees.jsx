import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { DollarSign, CheckCircle, Clock, Plus, X, Search, AlertCircle, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

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
  const [transactionType, setTransactionType] = useState('INVOICE'); // 'INVOICE' or 'PAYMENT'
  
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), dueDate: '', remarks: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '', invoiceId: '', amount: '', paymentMode: '', referenceNo: '', remarks: ''
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
        api.get('/fees/history')
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

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/invoice', invoiceForm);
      setShowAddModal(false);
      setInvoiceForm({ studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), dueDate: '', remarks: '' });
      toast.success('Invoice created successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/payment', paymentForm);
      setShowAddModal(false);
      setPaymentForm({ studentId: '', invoiceId: '', amount: '', paymentMode: '', referenceNo: '', remarks: '' });
      toast.success('Payment recorded successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const filteredSummary = feeSummary.filter(f => 
    f.student?.name.toLowerCase().includes(searchSummary.toLowerCase()) || 
    f.student?.erpId.toLowerCase().includes(searchSummary.toLowerCase())
  );

  const filteredHistory = feeHistory.filter(f => 
    f.student?.name.toLowerCase().includes(searchHistory.toLowerCase()) || 
    f.student?.erpId.toLowerCase().includes(searchHistory.toLowerCase()) ||
    (f.referenceNo && f.referenceNo.toLowerCase().includes(searchHistory.toLowerCase())) ||
    (f.invoiceNumber && f.invoiceNumber.toLowerCase().includes(searchHistory.toLowerCase()))
  );

  const selectedStudentInvoices = feeHistory.filter(h => h.type === 'Invoice' && h.student?.id === paymentForm.studentId);
  const outstandingInvoices = selectedStudentInvoices.filter(inv => {
    const paymentsForInvoice = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === inv.invoiceNumber);
    const totalPaidForInvoice = paymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);
    return totalPaidForInvoice < inv.amount;
  }).map(inv => {
    const paymentsForInvoice = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === inv.invoiceNumber);
    const totalPaidForInvoice = paymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);
    return { ...inv, outstandingAmount: inv.amount - totalPaidForInvoice };
  });

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
        
        {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && (
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
                          <td className="p-4 font-mono font-medium text-gray-600">₹{(summary.totalAmount / 100).toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-gray-900">₹{(summary.dueAmount / 100).toFixed(2)}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {summary.dueDate ? new Date(summary.dueDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4">
                            {summary.status === 'PAID' && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>}
                            {summary.status === 'PARTIALLY_PAID' && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100 flex w-fit items-center"><DollarSign className="w-3 h-3 mr-1"/> PARTIAL</span>}
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
                    placeholder="Search student, ERP ID, Ref No, or Invoice..." 
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
                        <th className="p-4 w-12">Type</th>
                        <th className="p-4">Student</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Remarks</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredHistory.map(fee => (
                        <tr key={fee.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="p-4">
                            {fee.type === 'Invoice' ? (
                              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center" title="Invoice (Charge)">
                                <ArrowUpRight className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center" title="Payment (Received)">
                                <ArrowDownLeft className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{fee.student?.name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{fee.student?.erpId}</p>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-700">
                            {fee.type === 'Payment' ? (
                              <span className="text-emerald-600">+₹{(fee.amount / 100).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-900">₹{(fee.amount / 100).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs font-bold text-gray-700 font-mono">{fee.invoiceNumber}</span>
                              {fee.type === 'Invoice' ? (
                                <span className="text-xs text-gray-500">Bill: {monthNames[fee.month - 1]} {fee.year}</span>
                              ) : (
                                <>
                                  {fee.paymentMode && <span className="text-xs text-gray-500 font-medium">via {fee.paymentMode}</span>}
                                  {fee.referenceNo && <span className="text-xs text-gray-400 font-mono">Ref: {fee.referenceNo}</span>}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{fee.remarks || '-'}</td>
                          <td className="p-4 text-sm text-gray-500">
                            {new Date(fee.date).toLocaleDateString()}
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
            
            <div className="px-6 pt-4">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => setTransactionType('INVOICE')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${transactionType === 'INVOICE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Create Invoice
                </button>
                <button 
                  onClick={() => setTransactionType('PAYMENT')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${transactionType === 'PAYMENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Record Payment
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {transactionType === 'INVOICE' ? (
                <form onSubmit={handleCreateInvoice} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <select required value={invoiceForm.studentId} onChange={e => setInvoiceForm({...invoiceForm, studentId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        <option value="">Select Student...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.erpId})</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input required type="number" step="0.01" value={invoiceForm.amount} onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 1500.00" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                      <input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Month</label>
                      <select required value={invoiceForm.month} onChange={e => setInvoiceForm({...invoiceForm, month: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Year</label>
                      <input required type="number" value={invoiceForm.year} onChange={e => setInvoiceForm({...invoiceForm, year: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input type="text" value={invoiceForm.remarks} onChange={e => setInvoiceForm({...invoiceForm, remarks: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Tuition Fee" />
                  </div>
                  
                  <div className="pt-2 flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">Create Invoice</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecordPayment} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <select required value={paymentForm.studentId} onChange={e => setPaymentForm({...paymentForm, studentId: e.target.value, invoiceId: ''})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        <option value="">Select Student...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.erpId})</option>)}
                      </select>
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Invoice</label>
                      <select required value={paymentForm.invoiceId} onChange={e => setPaymentForm({...paymentForm, invoiceId: e.target.value})} disabled={!paymentForm.studentId} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        <option value="">Select Invoice...</option>
                        {outstandingInvoices.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} ({monthNames[inv.month - 1]} {inv.year}) - Due: ₹{(inv.outstandingAmount / 100).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                      <input required type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. 500.00" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                      <select required value={paymentForm.paymentMode} onChange={e => setPaymentForm({...paymentForm, paymentMode: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        <option value="">Select Mode...</option>
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Credit/Debit Card</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                      <input type="text" value={paymentForm.referenceNo} onChange={e => setPaymentForm({...paymentForm, referenceNo: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="(Optional)" />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <input type="text" value={paymentForm.remarks} onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Optional notes" />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">Record Payment</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
