import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import ResponsiveTable from './ui/ResponsiveTable';
import ConfirmDialog from './ui/ConfirmDialog';

export default function PaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [verifyConfirm, setVerifyConfirm] = useState({ isOpen: false, payment: null, action: null });

  useEffect(() => {
    fetchPendingPayments(page);
  }, [page]);

  const fetchPendingPayments = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await api.get(`/fees/upi/pending?page=${pageNum}&limit=20`);
      const { data, pagination } = res.data;
      if (pageNum === 1) {
        setPayments(data || []);
      } else {
        setPayments(prev => [...prev, ...(data || [])]);
      }
      setHasMore(pageNum < (pagination?.totalPages || 1));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const { payment, action } = verifyConfirm;
      await api.post(`/fees/upi/${payment.id}/verify`, { action });
      toast.success(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setVerifyConfirm({ isOpen: false, payment: null, action: null });
      if (page === 1) fetchPendingPayments(1);
      else setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify payment');
    }
  };

  const filteredPayments = payments.filter(p => {
    return (
      p.invoice?.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice?.student?.erpId.toLowerCase().includes(search.toLowerCase()) ||
      p.utr?.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading && page === 1) {
    return (
      <div className="flex justify-center p-12">
        <span className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex bg-white p-3 rounded-2xl shadow-sm border border-gray-100 justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search student, ERP ID, or UTR..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="text-sm font-medium text-gray-500">
          {payments.length} pending
        </div>
      </div>

      <ResponsiveTable
        data={filteredPayments}
        hasMore={hasMore}
        onLoadMore={() => setPage(p => p + 1)}
        keyExtractor={(payment) => payment.id}
        emptyMessage="No pending payments found."
        emptyIcon={FileText}
        columns={[
          {
            header: 'Student & Invoice',
            render: (p) => (
              <div>
                <p className="font-bold text-gray-900">{p.invoice?.student?.name}</p>
                <div className="flex gap-2 items-center text-xs text-gray-500 font-mono mt-0.5">
                  <span>{p.invoice?.student?.erpId}</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{p.invoice?.invoiceNumber}</span>
                </div>
              </div>
            )
          },
          {
            header: 'Amount',
            render: (p) => <span className="font-mono font-bold text-emerald-600">₹{(p.amount / 100).toFixed(2)}</span>
          },
          {
            header: 'UTR No.',
            render: (p) => <span className="font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">{p.utr}</span>
          },
          {
            header: 'Screenshot',
            render: (p) => p.screenshotUrl ? (
              <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-xs">
                <ImageIcon className="w-4 h-4 mr-1" /> View
              </a>
            ) : <span className="text-gray-400 text-xs">None</span>
          },
          { header: 'Submitted At', render: (p) => <span className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleString()}</span> },
          {
            header: 'Actions',
            align: 'right',
            render: (p) => (
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setVerifyConfirm({ isOpen: true, payment: p, action: 'approve' })}
                  className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </button>
                <button 
                  onClick={() => setVerifyConfirm({ isOpen: true, payment: p, action: 'reject' })}
                  className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </button>
              </div>
            )
          }
        ]}
        renderMobileCard={(p) => (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-gray-50 pb-3">
              <div>
                <h3 className="font-bold text-gray-900">{p.invoice?.student?.name}</h3>
                <p className="text-xs text-gray-500 font-mono">ID: {p.invoice?.student?.erpId}</p>
              </div>
              <span className="font-mono font-bold text-lg text-emerald-600">₹{(p.amount / 100).toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100/50">
              <div className="col-span-2">
                <span className="text-gray-500 text-xs block">Invoice</span>
                <span className="font-mono text-gray-700">{p.invoice?.invoiceNumber}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 text-xs block">UTR Number</span>
                <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 inline-block mt-1">{p.utr}</span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="text-gray-500 text-xs block mb-1">Screenshot</span>
                {p.screenshotUrl ? (
                  <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors">
                    <ExternalLink className="w-3 h-3 mr-1" /> Open Image
                  </a>
                ) : <span className="text-gray-400 text-xs">Not provided</span>}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-50 mt-2">
              <button 
                onClick={() => setVerifyConfirm({ isOpen: true, payment: p, action: 'reject' })}
                className="flex-1 flex justify-center items-center px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reject
              </button>
              <button 
                onClick={() => setVerifyConfirm({ isOpen: true, payment: p, action: 'approve' })}
                className="flex-1 flex justify-center items-center px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
              </button>
            </div>
          </div>
        )}
      />

      <ConfirmDialog 
        isOpen={verifyConfirm.isOpen}
        title={`${verifyConfirm.action === 'approve' ? 'Approve' : 'Reject'} Payment`}
        message={`Are you sure you want to ${verifyConfirm.action} this payment of ₹${((verifyConfirm.payment?.amount || 0) / 100).toFixed(2)} from ${verifyConfirm.payment?.invoice?.student?.name}?`}
        confirmText={`Yes, ${verifyConfirm.action}`}
        onConfirm={handleVerify}
        onCancel={() => setVerifyConfirm({ isOpen: false, payment: null, action: null })}
      />
    </div>
  );
}
