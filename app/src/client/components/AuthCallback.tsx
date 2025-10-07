import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';

export const AuthCallback = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // The auth callback is handled automatically by react-oidc-context
    // We just need to redirect after successful authentication
    if (auth.isAuthenticated) {
      navigate('/');
    } else if (auth.error) {
      console.error('Authentication error:', auth.error);
      navigate('/?error=auth_failed');
    }
  }, [auth.isAuthenticated, auth.error, navigate]);

  // Show loading while processing callback
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (auth.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Authentication failed. Please try again.</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};