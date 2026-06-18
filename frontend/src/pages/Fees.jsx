import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import EntityCombobox from '../components/ui/EntityCombobox';
import { DollarSign, CheckCircle, Clock, Plus, X, Search, AlertCircle, FileText, ArrowDownLeft, ArrowUpRight, Edit2, Trash2, QrCode, ShieldCheck } from 'lucide-react';
import UpiPaymentModal from '../components/UpiPaymentModal';
import PaymentVerification from '../components/PaymentVerification';

export default function Fees() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'history'
  const [feeSummary, setFeeSummary] = useState([]);
  const [feeHistory, setFeeHistory] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchSummary, setSearchSummary] = useState('');
  const [searchHistory, setSearchHistory] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState('INVOICE'); // 'INVOICE' or 'PAYMENT'
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete Confirm State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  
  const [selectedInvoiceForUpi, setSelectedInvoiceForUpi] = useState(null);

  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), dueDate: '', remarks: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '', invoiceId: '', amount: '', paymentMode: '', referenceNo: '', remarks: ''
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
        const formattedStudents = studentsRes.data.map(student => {
          const section = student.studentProfile?.section;
          const className = section?.class?.name || '';
          const sectionName = section?.name || '';
          
          return {
            ...student,
            classDetails: section ? `${className}${sectionName}`.trim() : ''
          };
        });
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resetForms = () => {
    setInvoiceForm({ studentId: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), dueDate: '', remarks: '' });
    setPaymentForm({ studentId: '', invoiceId: '', amount: '', paymentMode: '', referenceNo: '', remarks: '' });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenAddModal = () => {
    resetForms();
    setShowAddModal(true);
  };

  const handleQuickInvoice = (studentId) => {
    resetForms();
    setTransactionType('INVOICE');
    setInvoiceForm(prev => ({ ...prev, studentId }));
    setShowAddModal(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/fees/invoice/${editingId}`, invoiceForm);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/fees/invoice', invoiceForm);
        toast.success('Invoice created successfully');
      }
      setShowAddModal(false);
      resetForms();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/fees/payment/${editingId}`, paymentForm);
        toast.success('Payment updated successfully');
      } else {
        await api.post('/fees/payment', paymentForm);
        toast.success('Payment recorded successfully');
      }
      setShowAddModal(false);
      resetForms();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save payment');
    }
  };

  const handleEdit = (fee) => {
    setIsEditing(true);
    setEditingId(fee.id);
    if (fee.type === 'Invoice') {
      setTransactionType('INVOICE');
      setInvoiceForm({
        studentId: fee.student.id,
        amount: (fee.amount / 100).toString(),
        month: fee.month,
        year: fee.year,
        dueDate: fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '',
        remarks: fee.remarks || ''
      });
    } else {
      setTransactionType('PAYMENT');
      setPaymentForm({
        studentId: fee.student.id,
        invoiceId: '',
        amount: (fee.amount / 100).toString(),
        paymentMode: fee.paymentMode || '',
        referenceNo: fee.referenceNo || '',
        remarks: fee.remarks || ''
      });
    }
    setShowAddModal(true);
  };

  const handleDeleteClick = (fee) => {
    setRecordToDelete(fee);
    if (fee.type === 'Invoice') {
      const paymentsForInvoice = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === fee.invoiceNumber);
      const totalPayments = paymentsForInvoice.length;
      const totalAmount = paymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);

      if (totalPayments > 0) {
        setDeleteMessage(`This invoice contains ${totalPayments} payment record(s) totaling ₹${(totalAmount / 100).toFixed(2)}. Deleting the invoice will also remove all associated payments and may affect financial reports. This action cannot be undone`);
      } else {
        setDeleteMessage('Are you sure you want to delete this invoice? This action cannot be undone.');
      }
    } else {
      setDeleteMessage('Are you sure you want to delete this payment? This action cannot be undone.');
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (recordToDelete.type === 'Invoice') {
        await api.delete(`/fees/invoice/${recordToDelete.id}`);
        toast.success('Invoice deleted successfully');
      } else {
        await api.delete(`/fees/payment/${recordToDelete.id}`);
        toast.success('Payment deleted successfully');
      }
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    }
  };

  const filteredSummary = feeSummary.filter(f => {
    const matchesSearch = f.student?.name.toLowerCase().includes(searchSummary.toLowerCase()) || 
                          f.student?.erpId.toLowerCase().includes(searchSummary.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredHistory = feeHistory.filter(f => {
    const matchesSearch = f.student?.name.toLowerCase().includes(searchHistory.toLowerCase()) || 
                          f.student?.erpId.toLowerCase().includes(searchHistory.toLowerCase()) ||
                          (f.referenceNo && f.referenceNo.toLowerCase().includes(searchHistory.toLowerCase())) ||
                          (f.invoiceNumber && f.invoiceNumber.toLowerCase().includes(searchHistory.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || f.type.toUpperCase() === typeFilter.toUpperCase();
    return matchesSearch && matchesType;
  });

  const selectedStudentInvoices = feeHistory.filter(h => h.type === 'Invoice' && h.student?.id === paymentForm.studentId);
  const outstandingInvoices = selectedStudentInvoices.filter(inv => {
    const paymentsForInvoice = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === inv.invoiceNumber && h.status !== 'REJECTED');
    const totalPaidForInvoice = paymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);
    return totalPaidForInvoice < inv.amount;
  }).map(inv => {
    const paymentsForInvoice = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === inv.invoiceNumber && h.status !== 'REJECTED');
    const totalPaidForInvoice = paymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);
    return { ...inv, outstandingAmount: inv.amount - totalPaidForInvoice };
  });

  const renderStudentDetailsCard = (selectedStudentId) => {
    if (!selectedStudentId) return null;
    const s = students.find(x => x.id === selectedStudentId);
    if (!s) return null;
    const summary = feeSummary.find(x => x.student.id === selectedStudentId);
    
    return (
      <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-2 shadow-inner">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Class</span>
          <span className="text-sm font-medium text-gray-900">{s.classDetails}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Admission No</span>
          <span className="text-sm font-mono text-gray-900">{s.erpId}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-1">
          <span className="text-sm font-medium text-gray-700">Outstanding Fees</span>
          <span className={`text-sm font-mono font-bold ${summary?.dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{((summary?.dueAmount || 0) / 100).toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  const renderComboboxItem = (s) => {
    const summary = feeSummary.find(x => x.student.id === s.id);
    const dueAmount = summary?.dueAmount || 0;
    
    return (
      <div className="flex flex-col w-full pr-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900">{s.name}</span>
          {dueAmount > 0 ? (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">Due: ₹{(dueAmount / 100).toFixed(2)}</span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">No Dues</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">{s.erpId}</span>
          {s.classDetails && <span className="text-xs text-gray-500">{s.classDetails}</span>}
        </div>
      </div>
    );
  };

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
            onClick={handleOpenAddModal}
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
        {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && (
          <button
            onClick={() => setActiveTab('verification')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center ${activeTab === 'verification' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" /> Verification
          </button>
        )}
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
              <div className="flex flex-col xl:flex-row gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 justify-between items-start xl:items-center">
                <div className="relative w-full xl:w-72 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search student or ERP ID..." 
                    value={searchSummary}
                    onChange={(e) => setSearchSummary(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'NO_FEES', label: 'NO FEES', Icon: FileText, active: 'bg-gray-100 text-gray-700 border-gray-300' },
                    { val: 'PAID', label: 'PAID', Icon: CheckCircle, active: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { val: 'PARTIALLY_PAID', label: 'PARTIAL', Icon: DollarSign, active: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { val: 'PENDING', label: 'PENDING', Icon: Clock, active: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { val: 'OVERDUE', label: 'OVERDUE', Icon: AlertCircle, active: 'bg-red-50 text-red-700 border-red-200' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setStatusFilter(statusFilter === opt.val ? 'ALL' : opt.val)}
                      className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        statusFilter === opt.val 
                          ? opt.active + ' shadow-sm' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <opt.Icon className={`w-3.5 h-3.5 mr-1.5 ${statusFilter === opt.val ? '' : 'opacity-70'}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <ResponsiveTable
                data={filteredSummary}
                keyExtractor={(item) => item.student.id}
                emptyMessage="No student records found matching your search."
                emptyIcon={Search}
                columns={[
                  {
                    header: 'Student',
                    render: (summary) => (
                      <div>
                        <p className="font-bold text-gray-900">{summary.student.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{summary.student.erpId}</p>
                      </div>
                    )
                  },
                  { header: 'Class/Sec', render: (s) => <span className="text-sm text-gray-600">{s.student.classDetails}</span> },
                  { header: 'Total Billed', render: (s) => <span className="font-mono font-medium text-gray-600">₹{(s.totalAmount / 100).toFixed(2)}</span> },
                  { header: 'Amount Due', render: (s) => <span className="font-mono font-bold text-gray-900">₹{(s.dueAmount / 100).toFixed(2)}</span> },
                  { header: 'Due Date', render: (s) => <span className="text-sm text-gray-600">{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '-'}</span> },
                  {
                    header: 'Status',
                    render: (summary) => (
                      <>
                        {summary.status === 'NO_FEES' && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md border border-gray-200 flex w-fit items-center"><FileText className="w-3 h-3 mr-1"/> NO FEES</span>}
                        {summary.status === 'PAID' && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>}
                        {summary.status === 'PARTIALLY_PAID' && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100 flex w-fit items-center"><DollarSign className="w-3 h-3 mr-1"/> PARTIAL</span>}
                        {summary.status === 'PENDING' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100 flex w-fit items-center"><Clock className="w-3 h-3 mr-1"/> PENDING</span>}
                        {summary.status === 'OVERDUE' && <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100 flex w-fit items-center"><AlertCircle className="w-3 h-3 mr-1"/> OVERDUE</span>}
                      </>
                    )
                  },
                  {
                    header: 'Action',
                    align: 'right',
                    render: (summary) => (
                      summary.status === 'NO_FEES' ? (
                        <button onClick={() => handleQuickInvoice(summary.student.id)} className="text-blue-600 hover:text-blue-700 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                          Create Invoice
                        </button>
                      ) : (
                        <button onClick={() => { setSearchHistory(summary.student.erpId); setActiveTab('history'); }} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                          View History
                        </button>
                      )
                    )
                  }
                ]}
                renderMobileCard={(summary) => (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{summary.student.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">ID: {summary.student.erpId}</p>
                      </div>
                      <div>
                        {summary.status === 'NO_FEES' && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md border border-gray-200 flex w-fit items-center"><FileText className="w-3 h-3 mr-1"/> NO FEES</span>}
                        {summary.status === 'PAID' && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>}
                        {summary.status === 'PARTIALLY_PAID' && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100 flex w-fit items-center"><DollarSign className="w-3 h-3 mr-1"/> PARTIAL</span>}
                        {summary.status === 'PENDING' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100 flex w-fit items-center"><Clock className="w-3 h-3 mr-1"/> PENDING</span>}
                        {summary.status === 'OVERDUE' && <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100 flex w-fit items-center"><AlertCircle className="w-3 h-3 mr-1"/> OVERDUE</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500 text-xs block">Total Billed</span><span className="font-mono font-medium text-gray-600">₹{(summary.totalAmount / 100).toFixed(2)}</span></div>
                      <div><span className="text-gray-500 text-xs block">Amount Due</span><span className="font-mono font-bold text-gray-900">₹{(summary.dueAmount / 100).toFixed(2)}</span></div>
                      <div><span className="text-gray-500 text-xs block">Due Date</span><span>{summary.dueDate ? new Date(summary.dueDate).toLocaleDateString() : '-'}</span></div>
                      <div><span className="text-gray-500 text-xs block">Class</span><span>{summary.student.classDetails}</span></div>
                    </div>
                    <div className="pt-2">
                      {summary.status === 'NO_FEES' ? (
                        <button onClick={() => handleQuickInvoice(summary.student.id)} className="w-full text-center text-blue-600 hover:text-blue-700 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors">
                          Create Invoice
                        </button>
                      ) : (
                        <button onClick={() => { setSearchHistory(summary.student.erpId); setActiveTab('history'); }} className="w-full text-center text-emerald-600 hover:text-emerald-700 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors">
                          View History
                        </button>
                      )}
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* TAB B: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 justify-between items-start sm:items-center">
                <div className="relative w-full sm:w-72 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search student, ERP ID, Ref No, or Invoice..." 
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'INVOICE', label: 'INVOICES', Icon: user?.role === 'STUDENT' ? ArrowDownLeft : ArrowUpRight, active: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { val: 'PAYMENT', label: 'PAYMENTS', Icon: user?.role === 'STUDENT' ? ArrowUpRight : ArrowDownLeft, active: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setTypeFilter(typeFilter === opt.val ? 'ALL' : opt.val)}
                      className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        typeFilter === opt.val 
                          ? opt.active + ' shadow-sm' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <opt.Icon className={`w-3.5 h-3.5 mr-1.5 ${typeFilter === opt.val ? '' : 'opacity-70'}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <ResponsiveTable
                data={filteredHistory}
                keyExtractor={(item) => item.id}
                emptyMessage="No fee records found for this student."
                emptyIcon={FileText}
                columns={[
                  {
                    header: 'Transaction',
                    render: (fee) => (
                      <div className="flex items-center gap-3">
                        {fee.type === 'Invoice' ? (
                          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0" title="Invoice (Charge)">
                            {user?.role === 'STUDENT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                        ) : fee.status === 'REJECTED' ? (
                          <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0" title="Payment (Rejected)">
                            <X className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0" title="Payment (Received)">
                            {user?.role === 'STUDENT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{fee.student?.name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{fee.student?.erpId}</p>
                        </div>
                      </div>
                    )
                  },
                  {
                    header: 'Amount',
                    render: (fee) => (
                      <span className={`font-mono font-bold ${fee.type === 'Payment' ? (fee.status === 'REJECTED' ? 'text-red-600' : 'text-emerald-600') : 'text-gray-900'}`}>
                        {fee.type === 'Payment' && fee.status !== 'REJECTED' ? '+' : ''}₹{(fee.amount / 100).toFixed(2)}
                      </span>
                    )
                  },
                  {
                    header: 'Details',
                    render: (fee) => (
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
                    )
                  },
                  { header: 'Remarks', render: (fee) => <span className="text-sm text-gray-500">{fee.remarks || '-'}</span> },
                  { header: 'Date', render: (fee) => <span className="text-sm text-gray-500">{new Date(fee.date).toLocaleDateString()}</span> },
                  ...((user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') ? [{
                    header: 'Actions',
                    align: 'right',
                    render: (fee) => (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(fee)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(fee)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  }] : [{
                    header: 'Actions',
                    align: 'right',
                    render: (fee) => {
                      if (fee.type !== 'Invoice') return null;
                      const payments = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === fee.invoiceNumber && (h.status === 'SUCCESS' || !h.status));
                      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                      if (totalPaid >= fee.amount) return <span className="text-emerald-600 text-xs font-bold">Paid</span>;
                      
                      const pendingPayment = feeHistory.find(h => h.type === 'Payment' && h.invoiceNumber === fee.invoiceNumber && h.status === 'PENDING_VERIFICATION');
                      if (pendingPayment) {
                        return <span className="text-amber-600 text-xs font-bold px-3 py-1.5 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200 w-fit ml-auto"><Clock className="w-3.5 h-3.5 mr-1" /> Verification Pending</span>;
                      }

                      return (
                        <button 
                          onClick={() => setSelectedInvoiceForUpi(fee.id)}
                          className="flex items-center text-emerald-600 hover:text-emerald-700 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1" /> Pay via UPI
                        </button>
                      );
                    }
                  }])
                ]}
                renderMobileCard={(fee) => (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3">
                        {fee.type === 'Invoice' ? (
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            {user?.role === 'STUDENT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                        ) : fee.status === 'REJECTED' ? (
                          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <X className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            {user?.role === 'STUDENT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-gray-900">{fee.student?.name}</h3>
                          <p className="text-xs text-gray-500 font-mono">ID: {fee.student?.erpId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-bold text-lg ${fee.type === 'Payment' ? (fee.status === 'REJECTED' ? 'text-red-600' : 'text-emerald-600') : 'text-gray-900'}`}>
                          {fee.type === 'Payment' && fee.status !== 'REJECTED' ? '+' : ''}₹{(fee.amount / 100).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{new Date(fee.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                      <div className="col-span-2">
                        <span className="text-gray-500 text-xs block">Invoice/Ref</span>
                        <span className="font-mono text-gray-700">{fee.invoiceNumber}</span>
                      </div>
                      {fee.type === 'Invoice' ? (
                        <>
                          <div><span className="text-gray-500 text-xs block">Billing Period</span><span>{monthNames[fee.month - 1]} {fee.year}</span></div>
                          <div><span className="text-gray-500 text-xs block">Remarks</span><span>{fee.remarks || '-'}</span></div>
                        </>
                      ) : (
                        <>
                          <div><span className="text-gray-500 text-xs block">Mode</span><span className="font-medium">{fee.paymentMode || '-'}</span></div>
                          <div><span className="text-gray-500 text-xs block">Reference</span><span className="font-mono">{fee.referenceNo || '-'}</span></div>
                        </>
                      )}
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') ? (
                      <div className="pt-2 flex justify-end gap-2 border-t border-gray-50 mt-2">
                        <button onClick={() => handleEdit(fee)} className="flex items-center text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </button>
                        <button onClick={() => handleDeleteClick(fee)} className="flex items-center text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </button>
                      </div>
                    ) : (
                      fee.type === 'Invoice' && (() => {
                        const payments = feeHistory.filter(h => h.type === 'Payment' && h.invoiceNumber === fee.invoiceNumber && (h.status === 'SUCCESS' || !h.status));
                        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                        if (totalPaid >= fee.amount) return <div className="pt-2 flex justify-end gap-2 border-t border-gray-50 mt-2"><span className="text-emerald-600 text-xs font-bold px-3 py-1.5">Paid</span></div>;
                        
                        const pendingPayment = feeHistory.find(h => h.type === 'Payment' && h.invoiceNumber === fee.invoiceNumber && h.status === 'PENDING_VERIFICATION');
                        if (pendingPayment) {
                          return (
                            <div className="pt-2 flex justify-end gap-2 border-t border-gray-50 mt-2">
                              <span className="flex items-center text-amber-600 text-xs font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"><Clock className="w-3.5 h-3.5 mr-1" /> Verification Pending</span>
                            </div>
                          );
                        }

                        return (
                          <div className="pt-2 flex justify-end gap-2 border-t border-gray-50 mt-2">
                            <button 
                              onClick={() => setSelectedInvoiceForUpi(fee.id)}
                              className="flex items-center text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5 mr-1" /> Pay via UPI
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              />
            </div>
          )}

          {/* TAB C: VERIFICATION */}
          {activeTab === 'verification' && (user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && (
            <PaymentVerification />
          )}
        </>
      )}

      {selectedInvoiceForUpi && (
        <UpiPaymentModal 
          invoiceId={selectedInvoiceForUpi} 
          onClose={() => setSelectedInvoiceForUpi(null)}
          onSuccess={() => {
            setSelectedInvoiceForUpi(null);
            fetchData();
          }}
        />
      )}

      {/* ADD TRANSACTION MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center"><FileText className="w-5 h-5 mr-2 text-emerald-600" /> {isEditing ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button onClick={() => { setShowAddModal(false); resetForms(); }} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="px-6 pt-4">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  disabled={isEditing}
                  onClick={() => setTransactionType('INVOICE')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${transactionType === 'INVOICE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${isEditing && transactionType !== 'INVOICE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isEditing && transactionType === 'INVOICE' ? 'Edit Invoice' : 'Create Invoice'}
                </button>
                <button 
                  disabled={isEditing}
                  onClick={() => setTransactionType('PAYMENT')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${transactionType === 'PAYMENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${isEditing && transactionType !== 'PAYMENT' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isEditing && transactionType === 'PAYMENT' ? 'Edit Payment' : 'Record Payment'}
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {transactionType === 'INVOICE' ? (
                <form onSubmit={handleCreateInvoice} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <EntityCombobox
                        options={students}
                        value={invoiceForm.studentId}
                        onChange={(val) => setInvoiceForm({...invoiceForm, studentId: val})}
                        disabled={isEditing}
                        placeholder="Select Student..."
                        searchPlaceholder="Search by name or ERP ID..."
                        getDisplayValue={(s) => `${s.name} (${s.erpId})`}
                        filterFn={(options, query) => options.filter(s => 
                          s.name.toLowerCase().includes(query.toLowerCase()) || 
                          s.erpId.toLowerCase().includes(query.toLowerCase())
                        )}
                        renderItem={renderComboboxItem}
                      />
                      {renderStudentDetailsCard(invoiceForm.studentId)}
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
                    <button type="button" onClick={() => { setShowAddModal(false); resetForms(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
                      {isEditing ? 'Save Changes' : 'Create Invoice'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecordPayment} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <EntityCombobox
                        options={students}
                        value={paymentForm.studentId}
                        onChange={(val) => setPaymentForm({...paymentForm, studentId: val, invoiceId: ''})}
                        disabled={isEditing}
                        placeholder="Select Student..."
                        searchPlaceholder="Search by name or ERP ID..."
                        getDisplayValue={(s) => `${s.name} (${s.erpId})`}
                        filterFn={(options, query) => options.filter(s => 
                          s.name.toLowerCase().includes(query.toLowerCase()) || 
                          s.erpId.toLowerCase().includes(query.toLowerCase())
                        )}
                        renderItem={renderComboboxItem}
                      />
                      {renderStudentDetailsCard(paymentForm.studentId)}
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Invoice</label>
                      <select disabled={isEditing} required={!isEditing} value={paymentForm.invoiceId} onChange={e => setPaymentForm({...paymentForm, invoiceId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        {isEditing ? (
                          <option value="">(Invoice locked during edit)</option>
                        ) : (
                          <>
                            <option value="">Select Invoice...</option>
                            {outstandingInvoices.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoiceNumber} ({monthNames[inv.month - 1]} {inv.year}) - Due: ₹{(inv.outstandingAmount / 100).toFixed(2)}
                              </option>
                            ))}
                          </>
                        )}
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
                    <button type="button" onClick={() => { setShowAddModal(false); resetForms(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
                      {isEditing ? 'Save Changes' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title={recordToDelete?.type === 'Invoice' ? 'Delete Invoice' : 'Delete Payment'}
        message={deleteMessage}
        confirmText={recordToDelete?.type === 'Invoice' && deleteMessage.includes('payment record') ? 'Delete Invoice + Payments' : 'Delete'}
        confirmColor="red"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setRecordToDelete(null);
        }}
      />
    </div>
  );
}
