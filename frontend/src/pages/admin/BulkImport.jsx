import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import FeeImportWizard from './FeeImportWizard';

export default function BulkImport() {
  const [activeTab, setActiveTab] = useState('students');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const tabs = [
    { id: 'students', label: 'Students', desc: 'Import student records and map them to classes/sections.' },
    { id: 'teachers', label: 'Teachers', desc: 'Import teacher records and assign them to sections.' },
    { id: 'fees', label: 'Fee Records', desc: 'Import historical or current fee records for students.' },
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // Clear previous results
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get(`/import/template/${activeTab}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setResult(null);

    const startTime = Date.now();

    try {
      const response = await api.post(`/import/${activeTab}`, formData);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setResult({
        success: true,
        message: response.data.message,
        count: response.data.count,
        duration: duration
      });
      toast.success(response.data.message);
      setFile(null); // Reset file
      
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (error.response && error.response.status === 400 && error.response.data) {
        // Validation failed, backend sends CSV string
        const csvString = error.response.data;
        setResult({
          success: false,
          csvString: csvString,
          duration: duration
        });
        toast.error('Validation failed. Please review the error report.');
      } else {
        toast.error('An unexpected error occurred during import.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!result?.csvString) return;
    const blob = new Blob([result.csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_import_errors.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
          <FileSpreadsheet className="w-7 h-7 mr-3 text-blue-600" />
          Bulk Data Import
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Onboard new data into SchoolChakra by uploading Excel (.xlsx) or CSV files. Follow the exact template structures to avoid validation errors.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-2xl mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setFile(null);
              setResult(null);
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'fees' ? (
        <FeeImportWizard />
      ) : (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">Import {tabs.find(t=>t.id===activeTab)?.label}</h2>
                <p className="text-gray-500 text-sm mt-1">{tabs.find(t=>t.id===activeTab)?.desc}</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm border border-blue-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div 
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 relative ${
                  file ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="pointer-events-none">
                  <div className={`mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-colors ${file ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                  </div>
                  
                  {file ? (
                    <div>
                      <p className="text-lg font-semibold text-gray-900 mb-1">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB • Ready to upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold text-gray-900 mb-1">Click or drag file to this area to upload</p>
                      <p className="text-sm text-gray-500">Support for single .xlsx, .xls, or .csv upload.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Import...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Start Import
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Results Area */}
          {result && (
            <div className={`p-8 sm:p-10 border-t ${result.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
              <div className="flex items-start">
                <div className={`mt-0.5 mr-4 p-2 rounded-full ${result.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {result.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {result.success ? 'Import Successful' : 'Import Failed: Validation Errors Found'}
                  </h3>
                  
                  {result.success ? (
                    <div>
                      <p className="text-emerald-700 text-sm mb-4">
                        {result.message}. All records were saved safely to the database.
                      </p>
                      <div className="flex gap-6">
                        <div className="bg-white px-4 py-3 rounded-xl border border-emerald-200 shadow-sm">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Records Imported</p>
                          <p className="text-2xl font-bold text-emerald-900">{result.count}</p>
                        </div>
                        <div className="bg-white px-4 py-3 rounded-xl border border-emerald-200 shadow-sm">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Time Taken</p>
                          <p className="text-2xl font-bold text-emerald-900">{result.duration}s</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-700 text-sm mb-4">
                        The entire import transaction was rolled back to prevent partial data corruption. 
                        Please download the error report, fix the issues in your file, and try again.
                      </p>
                      <button
                        onClick={downloadErrorReport}
                        className="flex items-center px-4 py-2.5 bg-white text-red-700 rounded-xl hover:bg-red-50 transition-colors font-medium text-sm border border-red-200 shadow-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Error Report (CSV)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
