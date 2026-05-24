import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function Fees() {
  const { user } = useAuthStore();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, [user]);

  const fetchFees = async () => {
    try {
      const res = await api.get('/fees');
      setFees(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (feeId) => {
    if (!window.confirm('Mark this fee as Paid?')) return;
    try {
      await api.put(`/fees/${feeId}/pay`);
      fetchFees();
    } catch (error) {
      alert('Failed to process payment');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-emerald-200/50">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage fee records</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fees.map(fee => (
                  <tr key={fee.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{fee.student?.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{fee.student?.erpId}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-gray-700">${fee.amount.toFixed(2)}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(fee.dueDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      {fee.status === 'PAID' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100 flex w-fit items-center"><CheckCircle className="w-3 h-3 mr-1"/> PAID</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100 flex w-fit items-center"><Clock className="w-3 h-3 mr-1"/> PENDING</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTS') && fee.status !== 'PAID' && (
                        <button onClick={() => handlePay(fee.id)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-xl hover:bg-emerald-700 shadow-sm">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No fee records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
