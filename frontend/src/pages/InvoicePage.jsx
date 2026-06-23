import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api'; // using standard api/axios setup based on existing code structure
import PrintableDocument from '../components/common/PrintableDocument';
import InvoiceTemplate from '../components/fees/InvoiceTemplate';

const InvoicePage = () => {
  const { invoiceId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        // Assuming api is configured with axios instance
        const response = await api.get(`/fees/invoices/${invoiceId}`);
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-100 font-medium">{error}</div>
      </div>
    );
  }

  return (
    <PrintableDocument title={`Invoice-${data?.invoiceNumber || invoiceId}`}>
      <InvoiceTemplate data={data} />
    </PrintableDocument>
  );
};

export default InvoicePage;
