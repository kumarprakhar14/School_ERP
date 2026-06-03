import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function FeeImportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [jobId, setJobId] = useState(null);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Step 2-3 data
  const [matchingStats, setMatchingStats] = useState(null);
  const [ambiguousRows, setAmbiguousRows] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [resolutions, setResolutions] = useState({}); // rowNumber -> studentId
  
  // Step 4 data
  const [previewData, setPreviewData] = useState(null);

  // STEP 1: Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsProcessing(true);
    try {
      // 1. Upload
      const uploadRes = await api.post('/import/fees/upload', formData);
      const newJobId = uploadRes.data.jobId;
      setJobId(newJobId);
      
      // 2. Validate
      await api.post(`/import/fees/${newJobId}/validate`);
      
      // 3. Match
      await api.post(`/import/fees/${newJobId}/match`);
      
      // 4. Reconcile
      const reconcileRes = await api.post(`/import/fees/${newJobId}/reconcile-matching`);
      setMatchingStats(reconcileRes.data);
      
      if (reconcileRes.data.status === 'AWAITING_RESOLUTION') {
        // Fetch ambiguous rows
        const ambRes = await api.get(`/import/fees/${newJobId}/ambiguous-rows`);
        setAmbiguousRows(ambRes.data);
        
        // Fetch all students for dropdown mapping
        const stuRes = await api.get('/users?role=STUDENT&limit=5000');
        setAllStudents(stuRes.data);
        
        setCurrentStep(2);
      } else {
        // Perfect match
        fetchPreview(newJobId);
      }
      
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Validation failed';
      toast.error(msg);
      setJobId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2: Resolve Ambiguity
  const handleResolve = (rowNumber, studentId) => {
    setResolutions(prev => ({ ...prev, [rowNumber]: studentId }));
  };

  const submitResolutions = async () => {
    // Only allow proceeding if all rows are resolved
    if (Object.keys(resolutions).length < ambiguousRows.length) {
      toast.error('Please map all ambiguous rows before proceeding');
      return;
    }

    setIsProcessing(true);
    try {
      const resArray = Object.entries(resolutions).map(([rowNumber, resolvedStudentId]) => ({
        rowNumber: parseInt(rowNumber, 10),
        resolvedStudentId
      }));

      const res = await api.post(`/import/fees/${jobId}/resolve`, { resolutions: resArray });
      
      if (res.data.status === 'READY_FOR_PREVIEW') {
        fetchPreview(jobId);
      } else {
        toast.error('Failed to fully resolve. Please check again.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error resolving ambiguity');
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3: Preview
  const fetchPreview = async (id) => {
    setIsProcessing(true);
    try {
      const res = await api.post(`/import/fees/${id}/preview`);
      setPreviewData(res.data);
      setCurrentStep(3);
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 4: Confirm
  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await api.post(`/import/fees/${jobId}/confirm`);
      toast.success(res.data.message);
      setCurrentStep(4);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm import');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/import/template/fees', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fees_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 capitalize">Fee Import Wizard</h2>
          <p className="text-gray-500 text-sm mt-1">Multi-stage onboarding to ensure 100% financial correctness.</p>
        </div>
        {currentStep === 1 && (
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm border border-blue-200"
          >
            Download Template
          </button>
        )}
      </div>

      {/* STEP 1: Upload */}
      {currentStep === 1 && (
        <form onSubmit={handleUpload}>
          <div className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 relative ${file ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={e => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="pointer-events-none">
              <div className={`mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-colors ${file ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>
              {file ? (
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500">Ready to validate & match</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">Click or drag file to upload</p>
                  <p className="text-sm text-gray-500">Support for .xlsx, .csv</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={!file || isProcessing}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : 'Upload & Validate'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Ambiguity Resolution */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mr-3 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900">Manual Mapping Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                Matched {matchingStats?.matchedRows} rows perfectly, but {ambiguousRows.length} rows could not be matched automatically. Please select the correct student for each row below.
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">Row</th>
                  <th className="p-3 font-semibold text-gray-600">Spreadsheet Data</th>
                  <th className="p-3 font-semibold text-gray-600">Map To Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ambiguousRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="p-3 text-gray-500 font-mono">#{row.rowNumber}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{row.studentName || 'No Name'}</div>
                      <div className="text-xs text-gray-500">ERP: {row.erpId || '-'} | Class: {row.className} {row.section}</div>
                    </td>
                    <td className="p-3">
                      <select 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        value={resolutions[row.rowNumber] || ''}
                        onChange={(e) => handleResolve(row.rowNumber, e.target.value)}
                      >
                        <option value="">Select Student...</option>
                        {allStudents.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.erpId}) - {s.studentProfile?.section?.class?.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={submitResolutions}
              disabled={isProcessing || Object.keys(resolutions).length < ambiguousRows.length}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resolving...</> : 'Confirm Mapping & Preview'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {currentStep === 3 && previewData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Financial Reconciliation Preview</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Ready for Commit</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
              <div className="text-sm font-semibold text-gray-500 mb-1">Total Fee Invoices</div>
              <div className="text-2xl font-black text-gray-900">₹{(previewData.totalInvoiceAmount / 100).toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-400 mt-2">{previewData.invoiceCount} invoices to generate</div>
            </div>
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <div className="text-sm font-semibold text-emerald-700 mb-1">Total Paid</div>
              <div className="text-2xl font-black text-emerald-700">₹{(previewData.totalPaymentAmount / 100).toLocaleString('en-IN')}</div>
              <div className="text-xs text-emerald-600/70 mt-2">{previewData.paymentCount} payments recorded</div>
            </div>
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <div className="text-sm font-semibold text-amber-700 mb-1">Outstanding Balance</div>
              <div className="text-2xl font-black text-amber-700">₹{(previewData.outstanding / 100).toLocaleString('en-IN')}</div>
              <div className="text-xs text-amber-600/70 mt-2">To be collected</div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Committing...</> : 'Confirm & Import Data'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Completed */}
      {currentStep === 4 && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Import Successful!</h2>
          <p className="text-gray-500 mb-8">All fee records and payments have been permanently saved to the database.</p>
          <button
            onClick={() => {
              setFile(null);
              setJobId(null);
              setCurrentStep(1);
            }}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
