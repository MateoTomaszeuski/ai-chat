import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { type ReactNode, type ErrorInfo } from 'react';
import { customToast } from '../lib/toast';

interface ErrorBoundaryProps {
  children: ReactNode;
}

function ErrorFallback() {
  return null;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    const errorMessage = error.message || 'An unexpected error occurred';
    customToast.error(
      <div>
        <div className="font-bold">Error</div>
        <div>{errorMessage}</div>
      </div>
    );
    
    console.error('Error caught by boundary:', error, errorInfo);
  };

  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ReactErrorBoundary>
  );
}
