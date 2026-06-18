import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service like Sentry
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    // When testing or in some cases, the user might want to try again
    this.setState({ hasError: false, error: null, errorInfo: null });
    // It's often safer to just reload the window if it's a global crash
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-gray-50 rounded-2xl border border-red-100">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">
              A critical error occurred while rendering this component. The development team has been notified.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 overflow-auto mb-6 max-h-48">
                <p className="text-xs font-mono text-red-600 font-bold mb-2">{this.state.error.toString()}</p>
                <p className="text-xs font-mono text-gray-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
