import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export default function UpiPaymentModal({ invoiceId, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: QR, 2: Submit
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fetchUri = async () => {
    try {
      const res = await api.get(`/fees/upi/${invoiceId}/uri`);
      setQrData(res.data);
      const url = await QRCode.toDataURL(res.data.uri, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrImageUrl(url);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate UPI QR. Ensure school UPI settings are configured.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android|ipad|playbook|silk/i.test(userAgent) || /iphone|ipod/i.test(userAgent)) {
        return true;
      }
      // Also check for touch capability + narrow screen as fallback for some tablets
      return ('ontouchstart' in window) && window.innerWidth <= 768;
    };
    setIsMobile(checkMobile());
    fetchUri();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      toast.error('UTR is required');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('utr', utr);
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }

    try {
      await api.post(`/fees/upi/${invoiceId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payment submitted and is pending verification.');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 1 ? 'Pay via UPI' : 'Submit Payment Details'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></span>
            </div>
          ) : step === 1 && qrData ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 w-full text-sm">
                <p className="font-medium">
                  {isMobile ? "Pay securely using any UPI app on your device" : "Scan this QR to pay your fee"}
                </p>
                <p className="text-xs mt-1">Amount and details are pre-filled.</p>
              </div>

              {isMobile ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <a
                    href={qrData.uri}
                    className="w-full py-3.5 bg-[#00A15D] hover:bg-[#008f51] text-white rounded-xl shadow-lg shadow-[#00A15D]/20 transition-all font-bold text-base flex justify-center items-center"
                  >
                    Pay Now with UPI App
                  </a>
                  
                  <div className="flex items-center w-full gap-3 my-1">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">or scan qr</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                  
                  <div className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm inline-block">
                    {qrImageUrl && <img src={qrImageUrl} alt="UPI QR Code" className="w-28 h-28" />}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                  {qrImageUrl && <img src={qrImageUrl} alt="UPI QR Code" className="w-48 h-48" />}
                </div>
              )}

              <div className="w-full text-left bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Due:</span>
                  <span className="font-bold text-gray-900">₹{(qrData.amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">School:</span>
                  <span className="font-medium text-gray-900">{qrData.merchantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice No:</span>
                  <span className="font-mono text-gray-700">{qrData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                  <span className="text-gray-500">UPI ID:</span>
                  <span className="font-medium text-gray-900 break-all ml-4 text-right">{qrData.upiId}</span>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm"
              >
                I have made the payment
              </button>
            </div>
          ) : step === 2 ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <p>Please enter the 12-digit UTR/Reference number of your successful UPI transaction.</p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">UTR / Transaction Reference No <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Screenshot (Optional)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {screenshot ? <span className="font-semibold text-emerald-600">{screenshot.name}</span> : 'Click to upload screenshot'}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setScreenshot(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center"
                >
                  {submitting ? 'Submitting...' : <><CheckCircle className="w-4 h-4 mr-2" /> Submit Verification</>}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
