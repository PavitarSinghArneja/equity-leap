import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('========================================');
    console.error('🚨 ERROR BOUNDARY CAUGHT AN ERROR 🚨');
    console.error('========================================');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('========================================');

    // Alert for visibility
    if (typeof window !== 'undefined') {
      window.alert(`ERROR CAUGHT!\n\nError: ${error.message}\n\nCheck console for details (F12)`);
    }

    // Clear potentially corrupted auth data
    try {
      localStorage.removeItem('retreat_slice_cached_session');
      localStorage.removeItem('retreat_slice_cached_profile');
      localStorage.removeItem('retreat_slice_cache_timestamp');
    } catch (e) {
      console.warn('Failed to clear corrupted auth data:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We encountered an unexpected error. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;