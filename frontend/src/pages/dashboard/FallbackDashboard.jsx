import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function FallbackDashboard({ onRetry }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-12 max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Failed to load your dashboard</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            We couldn't fetch the data needed to display your dashboard. This is usually a temporary issue — please try again.
          </p>
        </div>

        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer border-0 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}

