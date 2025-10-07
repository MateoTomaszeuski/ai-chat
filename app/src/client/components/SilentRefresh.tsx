import { useEffect } from 'react';

export const SilentRefresh = () => {
  useEffect(() => {
    // This component is loaded in an invisible iframe during silent token refresh
    // It processes the OIDC response and sends tokens back to the parent window
    
    const handleSilentRefresh = () => {
      try {
        // Parse the URL for OIDC response parameters
        const urlParams = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.substring(1));
        
        // Combine query params and fragment params
        const params: Record<string, string> = {};
        for (const [key, value] of urlParams) {
          params[key] = value;
        }
        for (const [key, value] of fragment) {
          params[key] = value;
        }
        
        // Send the result back to the parent window
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'oidc-silent-refresh-response',
            url: window.location.href,
            params: params
          }, window.location.origin);
        }
      } catch (error) {
        // Send error back to parent
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'oidc-silent-refresh-error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
        }
      }
    };

    // Run the silent refresh handler
    handleSilentRefresh();
  }, []);

  // This component renders nothing visible since it's in an iframe
  return (
    <div style={{ display: 'none' }}>
      Silent refresh in progress...
    </div>
  );
};