import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full border-t-4 border-red-600">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. The team has been notified. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-50 rounded p-4 mb-4 border border-gray-200">
                <p className="font-mono text-red-600 mb-2 text-sm break-words">
                  <span className="font-bold">Error:</span> {this.state.error?.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer font-semibold mb-2 hover:text-gray-900">
                      📋 Component Stack Trace
                    </summary>
                    <pre className="overflow-auto whitespace-pre-wrap bg-gray-100 p-2 rounded mt-2 max-h-40">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
              >
                <Home size={18} />
                Go Home
              </button>
            </div>
            
            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Error ID: {this.state.error?.name || 'UNKNOWN'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
