import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../../services/api/reports';
import { Banknote, TrendingUp, TrendingDown, CreditCard, AlertOctagon } from 'lucide-react';
import ResponsiveTable from '../../../components/ui/ResponsiveTable';

export default function FeeReportTab({ filters, setLoading, onError }) {
  const [collectionSummary, setCollectionSummary] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersPage, setDefaultersPage] = useState(1);
  const [defaultersHasMore, setDefaultersHasMore] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [filters]);

  useEffect(() => {
    fetchDefaulters(defaultersPage);
  }, [filters, defaultersPage]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [summaryRes, methodsRes] = await Promise.all([
        reportsApi.getFeeCollectionSummary(filters),
        reportsApi.getFeePaymentMethods(filters)
      ]);
      setCollectionSummary(summaryRes.data);
      setPaymentMethods(methodsRes.data);
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaulters = async (pageNum = 1) => {
    try {
      const res = await reportsApi.getFeeDefaulters({ ...filters, page: pageNum, limit: 10 });
      const { data, pagination } = res.data ? res : { data: res.data || res, pagination: res.pagination };
      if (pageNum === 1) {
        setDefaulters(data || []);
      } else {
        setDefaulters(prev => [...prev, ...(data || [])]);
      }
      setDefaultersHasMore(pageNum < (pagination?.totalPages || 1));
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (!collectionSummary) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500 mb-1">Expected Amount</p>
              <Banknote className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(collectionSummary.expectedAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500 mb-1">Collected Amount</p>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(collectionSummary.collectedAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500 mb-1">Outstanding</p>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(collectionSummary.outstandingAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500 mb-1">Collection Rate</p>
              <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-indigo-700">{collectionSummary.collectionPercentage ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${collectionSummary.collectionPercentage ?? 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods (CSS Styled Chart alternative) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col col-span-1">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Payment Methods</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {paymentMethods.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No payment data available.</p>
            ) : (
              <div className="space-y-5">
                {paymentMethods.sort((a, b) => b.amount - a.amount).map((pm, idx) => {
                  const total = paymentMethods.reduce((sum, item) => sum + item.amount, 0);
                  const percent = total > 0 ? (pm.amount / total) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
                  const colorClass = colors[idx % colors.length];
                  
                  return (
                    <div key={pm.method}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{pm.method}</span>
                        <span className="text-gray-900 font-semibold">{formatCurrency(pm.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`${colorClass} h-2 rounded-full transition-all duration-1000`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Defaulters Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col col-span-1 lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-gray-900">Fee Defaulters</h3>
            </div>
            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-md">
              {defaulters.length} Record(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <ResponsiveTable
              data={defaulters}
              hasMore={defaultersHasMore}
              onLoadMore={() => setDefaultersPage(p => p + 1)}
              keyExtractor={(d) => d.invoiceId}
              emptyMessage="No fee defaulters found for this period."
              emptyIcon={AlertOctagon}
              columns={[
                {
                  header: 'Student',
                  render: (d) => <p className="font-medium text-sm text-gray-900">{d.studentName}</p>
                },
                {
                  header: 'Class/Sec',
                  render: (d) => <p className="text-sm text-gray-600">{d.className} - {d.sectionName}</p>
                },
                {
                  header: 'Pending Amount',
                  render: (d) => <p className="font-semibold text-sm text-red-600">{formatCurrency(d.pendingAmount)}</p>
                },
                {
                  header: 'Overdue',
                  render: (d) => (
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      d.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {d.daysOverdue} Days
                    </span>
                  )
                }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
