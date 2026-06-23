import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, ArrowLeft } from 'lucide-react';

const PrintableDocument = ({ children, title = "Document" }) => {
  const contentRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const originalTitle = document.title;
    document.title = title;
    return () => {
      document.title = originalTitle;
    };
  }, [title]);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: title,
    pageStyle: `
      @page {
        size: auto;
        margin: 0mm;
      }
    `
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toolbar - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors border border-gray-200 sm:border-transparent"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button 
              onClick={() => handlePrint()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={() => handlePrint()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-x-auto border border-gray-200">
        <div ref={contentRef} className="bg-white text-gray-900 relative min-w-[794px]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PrintableDocument;
