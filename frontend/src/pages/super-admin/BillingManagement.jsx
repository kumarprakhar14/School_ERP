import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import ResponsiveTable from '../../components/ui/ResponsiveTable';

export default function BillingManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchOrders = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await api.get(`/billing/orders?page=${pageNum}&limit=20`);
      const { data, pagination } = res.data;
      if (pageNum === 1) {
        setOrders(data || []);
      } else {
        setOrders(prev => [...prev, ...(data || [])]);
      }
      setHasMore(pageNum < (pagination?.totalPages || 1));
    } catch (err) {
      toast.error('Failed to load billing orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PAID': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 uppercase"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</span>;
      case 'FAILED': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 uppercase"><XCircle className="w-3 h-3 mr-1"/> Failed</span>;
      case 'CREATED': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700 uppercase"><Calendar className="w-3 h-3 mr-1"/> Created</span>;
      case 'AWAITING_PAYMENT': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 uppercase"><RefreshCw className="w-3 h-3 mr-1"/> Awaiting</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-600 uppercase">Cancelled</span>;
      default: return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 uppercase">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.school.name.toLowerCase().includes(search.toLowerCase()) || 
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && page === 1) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><CreditCard className="w-6 h-6 mr-3 text-indigo-600"/> Billing & Payments</h1>
          <p className="text-gray-500 mt-2 max-w-3xl text-sm">Global overview of all payment orders, transactions, and subscription purchases across all schools.</p>
        </div>
        <button onClick={fetchOrders} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl flex items-center font-medium transition-colors shadow-sm text-sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by school or order ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <ResponsiveTable
            data={filteredOrders}
            hasMore={hasMore}
            onLoadMore={() => setPage(p => p + 1)}
            keyExtractor={(o) => o.id}
            emptyMessage="No billing orders found."
            emptyIcon={CreditCard}
            columns={[
              {
                header: 'School',
                render: (o) => (
                  <div>
                    <div className="font-bold text-gray-900">{o.school.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{o.school.code}</div>
                  </div>
                )
              },
              {
                header: 'Order ID',
                render: (o) => (
                  <div>
                    <div className="font-mono text-xs text-gray-600 truncate max-w-[150px]" title={o.id}>{o.id}</div>
                    {o.provider && <div className="text-[10px] uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded inline-block mt-1">{o.provider}</div>}
                  </div>
                )
              },
              {
                header: 'Amount',
                render: (o) => (
                  <div>
                    <div className="font-bold text-gray-900">{o.currency} {parseFloat(o.amount).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{o.planPricing?.plan?.name || 'Unknown Plan'}</div>
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
                header: 'Created At',
                render: (o) => (
                  <span className="text-gray-500 text-xs">{new Date(o.createdAt).toLocaleString()}</span>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
