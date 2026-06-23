import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const PaymentReceiptTemplate = ({ data }) => {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 80, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation failed:', err));
  }, []);

  if (!data) return null;

  const {
    receiptNumber,
    amount,
    paymentMode,
    referenceNo,
    utr,
    paidAt,
    createdAt,
    remarks,
    status,
    invoice,
    school
  } = data;

  const student = invoice?.student;
  const isSuccess = status === 'SUCCESS';
  
  const statusText = isSuccess ? 'PAYMENT SUCCESSFUL' : status.replace('_', ' ');

  const formatAmount = (amt) => `₹ ${(amt / 100).toFixed(2)}`;

  return (
    <div className="p-10 bg-white text-gray-900 relative">
      {/* Watermark */}
      <div className="watermark" style={{ fontSize: '6rem', color: isSuccess ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.05)' }}>
        {statusText}
      </div>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-200 pb-8 mb-8">
        <div className="flex items-center gap-4">
          {school?.settings?.logoUrl ? (
            <img src={school.settings.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
          ) : (
            <div className="h-16 w-16 bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl rounded">
              {school?.name?.charAt(0) || 'S'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0 p-0 leading-tight">{school?.name || 'School Name'}</h1>
            {school?.settings?.contactInfo && (
              <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{school.settings.contactInfo}</p>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <h2 className="text-3xl font-bold text-gray-200 mb-4 uppercase tracking-widest">PAYMENT RECEIPT</h2>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Receipt No:</td>
                <td className="font-medium text-gray-900 pb-1.5 text-left">{receiptNumber}</td>
              </tr>
              <tr>
                <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Generated On:</td>
                <td className="font-medium text-gray-900 pb-1.5 text-left">{new Date(createdAt).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Invoice Ref:</td>
                <td className="font-medium text-gray-900 pb-1.5 text-left">{invoice?.invoiceNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`py-3 px-4 mb-8 rounded-lg flex items-center justify-between ${isSuccess ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          )}
          <span className={`font-semibold ${isSuccess ? 'text-emerald-700' : 'text-amber-700'}`}>
            {statusText}
          </span>
        </div>
        <div className="font-bold text-lg text-gray-900">
          {formatAmount(amount)}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8 border-b border-gray-100 pb-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Received From</h3>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-gray-500 w-32 inline-block">Student Name:</span> <span className="font-semibold text-gray-900">{student?.name || 'N/A'}</span></p>
            <p><span className="font-medium text-gray-500 w-32 inline-block">Admission No:</span> <span className="font-semibold text-gray-900">{student?.erpId || 'N/A'}</span></p>
            <p><span className="font-medium text-gray-500 w-32 inline-block">Class/Sec:</span> <span className="font-semibold text-gray-900">{student?.studentProfile?.section?.class?.name || ''} - {student?.studentProfile?.section?.name || ''}</span></p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Details</h3>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-gray-500 w-32 inline-block">Payment Mode:</span> <span className="font-semibold text-gray-900">{paymentMode || 'N/A'}</span></p>
            {(referenceNo || utr) && (
              <p><span className="font-medium text-gray-500 w-32 inline-block">Transaction Ref:</span> <span className="font-semibold text-gray-900">{referenceNo || utr}</span></p>
            )}
            <p><span className="font-medium text-gray-500 w-32 inline-block">Fee Category:</span> <span className="font-semibold text-gray-900">Tuition Fee</span></p>
          </div>
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-600">Amount Received</span>
          <span className="text-2xl font-bold text-gray-900">{formatAmount(amount)}</span>
        </div>
        {remarks && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-500 block mb-1">Remarks:</span>
            <p className="text-sm text-gray-700">{remarks}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12">
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-500 font-medium">Thank you for your payment!</p>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                This receipt is electronically generated and is valid subject to the realization of the cheque/demand draft/online transfer.
              </p>
              {qrUrl && (
                <div className="mt-4 flex items-center gap-3">
                  <img src={qrUrl} alt="Verification QR Code" className="w-16 h-16 rounded border border-gray-100" />
                  <div className="text-xs text-gray-400">
                    <p className="font-semibold text-gray-500 uppercase tracking-wider">Scan to Verify</p>
                    <p>Authenticity of this document</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptTemplate;
