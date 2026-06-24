import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import api from '../lib/api';
import PaymentReceiptDocument from '../components/fees/PaymentReceiptDocument';

const PaymentReceiptPage = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 80, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation failed:', err));
  }, []);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/fees/payments/${paymentId}`);
        setData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch payment receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [paymentId]);

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

  const documentComponent = <PaymentReceiptDocument data={data} qrUrl={qrUrl} />;
  const fileName = `Receipt-${data?.receiptNumber || paymentId}.pdf`;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
          <button 
            onClick={() => navigate('/fees')}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors border border-gray-200 sm:border-transparent"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <PDFDownloadLink document={documentComponent} fileName={fileName}>
              {({ loading }) => (
                <button 
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto disabled:opacity-50"
                  disabled={loading}
                >
                  <Download className="w-4 h-4" />
                  {loading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </div>

      {/* PDF Viewer for Desktop */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 h-[800px] hidden sm:block">
        <PDFViewer width="100%" height="100%" className="border-none">
          {documentComponent}
        </PDFViewer>
      </div>

      {/* Mobile placeholder */}
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 sm:hidden text-center">
        <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Printer className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">PDF Document Ready</h3>
        <p className="text-sm text-gray-500 mb-6">PDF preview is limited on small screens. Please download the document to view it fully.</p>
        <PDFDownloadLink document={documentComponent} fileName={fileName}>
          {({ loading }) => (
            <button 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
              disabled={loading}
            >
              <Download className="w-5 h-5" />
              {loading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          )}
        </PDFDownloadLink>
      </div>
    </div>
  );
};

export default PaymentReceiptPage;
