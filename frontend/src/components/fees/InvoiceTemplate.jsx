import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const InvoiceTemplate = ({ data }) => {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 80, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation failed:', err));
  }, []);

  if (!data) return null;

  const {
    invoiceNumber,
    month,
    year,
    totalAmount,
    dueDate,
    createdAt,
    remarks,
    student,
    school,
    payments
  } = data;

  const paidAmount = payments?.reduce((sum, p) => p.status === 'SUCCESS' ? sum + p.amount : sum, 0) || 0;
  const balanceDue = totalAmount - paidAmount;
  const isPaid = balanceDue <= 0;
  
  const statusText = isPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY PAID' : 'PENDING');
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const feeMonth = monthNames[month - 1] || month;

  // Format amount to INR
  const formatAmount = (amt) => `₹ ${(amt / 100).toFixed(2)}`;

  return (
    <div className="p-10 bg-white text-gray-900 relative">
      {/* Watermark */}
      <div className="watermark">
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
          <h2 className="text-4xl font-bold text-gray-200 mb-4 uppercase tracking-widest">INVOICE</h2>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Invoice No:</td>
                <td className="font-medium text-gray-900 pb-1.5 text-left">{invoiceNumber}</td>
              </tr>
              <tr>
                <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Generated On:</td>
                <td className="font-medium text-gray-900 pb-1.5 text-left">{new Date(createdAt).toLocaleString('en-IN')}</td>
              </tr>
              {dueDate && (
                <tr>
                  <td className="font-semibold text-gray-600 pr-4 pb-1.5 text-right">Due Date:</td>
                  <td className="font-medium text-red-600 pb-1.5 text-left">{new Date(dueDate).toLocaleDateString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Billed To</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p className="text-sm text-gray-500">Student Name</p>
            <p className="font-semibold text-gray-900">{student?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Admission No</p>
            <p className="font-semibold text-gray-900">{student?.erpId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Class & Section</p>
            <p className="font-semibold text-gray-900">
              {student?.studentProfile?.section?.class?.name || ''} - {student?.studentProfile?.section?.name || ''}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contact</p>
            <p className="font-semibold text-gray-900">{student?.contactDetails || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Description</th>
              <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-center">Period</th>
              <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4 px-4">
                <p className="font-medium text-gray-900">Tuition Fee</p>
                {remarks && <p className="text-sm text-gray-500 mt-1">{remarks}</p>}
              </td>
              <td className="py-4 px-4 text-center text-gray-600">
                {feeMonth} {year}
              </td>
              <td className="py-4 px-4 text-right font-medium text-gray-900">
                {formatAmount(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="font-medium text-gray-600">Subtotal:</span>
            <span className="font-medium text-gray-900">{formatAmount(totalAmount)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 text-emerald-600">
            <span className="font-medium">Paid Amount:</span>
            <span className="font-medium">-{formatAmount(paidAmount)}</span>
          </div>
          <div className="flex justify-between py-3 bg-gray-50 px-4 mt-2 rounded-lg items-center">
            <span className="font-bold text-gray-900">Balance Due:</span>
            <span className="text-xl font-bold text-gray-900">{formatAmount(balanceDue > 0 ? balanceDue : 0)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12">
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-500 font-medium">Terms & Conditions:</p>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                1. Please clear all dues before the due date to avoid late fees.<br />
                2. This is a computer-generated document and does not require a physical signature.
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

export default InvoiceTemplate;
