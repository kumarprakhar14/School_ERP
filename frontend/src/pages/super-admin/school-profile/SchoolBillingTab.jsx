import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, PlayCircle, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import ResponsiveTable from '../../../components/ui/ResponsiveTable';

export default function SchoolBillingTab({ schoolId }) {
  const [orders, setOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [simulateModal, setSimulateModal] = useState({ isOpen: false, orderId: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    planPricingId: '',
    purpose: 'SUBSCRIPTION_PURCHASE'
  });

  const fetchData = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const [ordersRes, plansRes] = await Promise.all([
        api.get(`/billing/orders/school/${schoolId}?page=${pageNum}&limit=10`),
        api.get('/plans')
      ]);
      const { data, pagination } = ordersRes.data;
      if (pageNum === 1) {
        setOrders(data || []);
      } else {
        setOrders(prev => [...prev, ...(data || [])]);
      }
      setHasMore(pageNum < (pagination?.totalPages || 1));
      if (pageNum === 1) setPlans(plansRes.data);
    } catch (err) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) fetchData(page);
  }, [schoolId, page]);

  const refreshData = () => {
    setPage(1);
    fetchData(1);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/billing/orders', { schoolId, ...formData });
      toast.success('Payment order created successfully');
      setCreateModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    }
  };

  const handleSimulatePayment = async (result) => {
    try {
      await api.post(`/billing/orders/${simulateModal.orderId}/simulate`, { result });
      toast.success(`Payment simulation ${result.toLowerCase()} recorded`);
      setSimulateModal({ isOpen: false, orderId: null });
      refreshData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to simulate payment');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PAID': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 uppercase"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</span>;
      case 'FAILED': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 uppercase"><XCircle className="w-3 h-3 mr-1"/> Failed</span>;
      case 'AWAITING_PAYMENT': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 uppercase"><RefreshCw className="w-3 h-3 mr-1"/> Awaiting</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 uppercase">{status}</span>;
    }
  };

  if (loading && page === 1) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 sm:p-8 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center"><CreditCard className="w-5 h-5 mr-2 text-indigo-600"/> Payment Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Lifecycle of purchase intent for this school.</p>
          </div>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center font-medium transition-colors shadow-sm text-sm"
          >
            Create Test Order
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <ResponsiveTable
            data={orders}
            hasMore={hasMore}
            onLoadMore={() => setPage(p => p + 1)}
            keyExtractor={(o) => o.id}
            emptyMessage="No payment orders found for this school."
            emptyIcon={CreditCard}
            columns={[
              {
                header: 'Order ID / Provider',
                render: (o) => (
                  <div>
                    <div className="font-mono text-xs font-bold text-gray-900 truncate max-w-[150px]" title={o.id}>{o.id}</div>
                    <div className="text-xs text-gray-500 mt-1 uppercase">{o.provider || 'None'}</div>
                  </div>
                )
              },
              {
                header: 'Amount',
                render: (o) => (
                  <div>
                    <div className="font-bold text-gray-900">{o.currency} {parseFloat(o.amount).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{o.planPricing?.plan?.name || '-'}</div>
                  </div>
                )
              },
              {
                header: 'Purpose',
                render: (o) => (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{o.purpose.replace(/_/g, ' ')}</span>
                )
              },
              {
                header: 'Status',
                render: (o) => getStatusBadge(o.status)
              },
              {
                header: 'Actions',
                align: 'right',
                render: (o) => (
                  o.status === 'AWAITING_PAYMENT' && (
                    <button 
                      onClick={() => setSimulateModal({ isOpen: true, orderId: o.id })}
                      className="inline-flex items-center text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" /> Simulate
                    </button>
                  )
                )
              }
            ]}
          />
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between">
              <h2 className="font-bold text-gray-900">Create Payment Order</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg flex items-start text-sm mb-4">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <p>This generates a dummy intent and moves the order to <strong>AWAITING_PAYMENT</strong>. You can simulate the webhook in the next step.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan & Pricing</label>
                <select required value={formData.planPricingId} onChange={e => setFormData({...formData, planPricingId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                  <option value="">-- Choose Plan --</option>
                  {plans.map(p => (
                    <optgroup key={p.id} label={p.name}>
                      {p.pricing?.map(pr => (
                        <option key={pr.id} value={pr.id}>{p.name} - {pr.interval} ({pr.currency} {pr.price})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <select required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                  <option value="SUBSCRIPTION_PURCHASE">Initial Purchase</option>
                  <option value="SUBSCRIPTION_RENEWAL">Renewal</option>
                  <option value="SUBSCRIPTION_UPGRADE">Upgrade</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulate Modal */}
      {simulateModal.isOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Simulate Payment Webhook"
          message="Simulate the payment gateway's callback. A SUCCESS simulation will immediately generate a PaymentTransaction and assign the subscription."
          onConfirm={() => handleSimulatePayment('SUCCESS')}
          onCancel={() => setSimulateModal({ isOpen: false, orderId: null })}
          confirmText="Simulate SUCCESS"
          cancelText="Cancel"
          icon={PlayCircle}
          confirmColor="bg-green-600 hover:bg-green-700 text-white"
        />
      )}
    </div>
  );
}
