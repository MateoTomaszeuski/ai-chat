import { useAuth } from 'react-oidc-context';

/**
 * Custom hook to get authenticated headers for API requests
 */
export function useAuthHeaders() {
  const auth = useAuth();

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (auth.user?.access_token) {
      headers['Authorization'] = `Bearer ${auth.user.access_token}`;
    }

    return headers;
  };

  return { getHeaders, isAuthenticated: auth.isAuthenticated };
}

/**
 * Utility function to get auth headers outside of React components
 * This function reads from localStorage directly (for use in API services)
 */
export function getAuthHeadersFromStorage(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const authority = import.meta.env.VITE_OIDC_AUTHORITY || 'https://your-oidc-provider.com';
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'your-client-id';
    
    const possibleKeys = [
      `oidc.user:${authority}:${clientId}`,
      `oidc.user:${authority.replace(/\/$/, '')}:${clientId}`,
      `oidc.user:${authority}/${clientId}`,
      `oidc-user-${clientId}`,
      `user:${authority}:${clientId}`,
      'oidc.user',
      'oidc_user',
      'access_token',
      'id_token'
    ];
    
    let oidcStorage = null;
    
    // Try localStorage first
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        oidcStorage = data;
        break;
      }
    }
    
    // If not found in localStorage, try sessionStorage
    if (!oidcStorage) {
      for (const key of possibleKeys) {
        const data = sessionStorage.getItem(key);
        if (data) {
          oidcStorage = data;
          break;
        }
      }
    }

    if (oidcStorage) {
      const userData = JSON.parse(oidcStorage);
      const accessToken = userData.access_token || userData.id_token;

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
  } catch (error) {
    console.warn('Failed to get auth token from storage:', error);
  }

  return headers;
}

/**
 * Check if user is authenticated by checking for valid token in storage
 */
export function isAuthenticatedFromStorage(): boolean {
  try {
    const authority = import.meta.env.VITE_OIDC_AUTHORITY || 'https://your-oidc-provider.com';
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'your-client-id';
    const storageKey = `oidc.user:${authority}:${clientId}`;
    const oidcStorage = localStorage.getItem(storageKey);

    if (oidcStorage) {
      const userData = JSON.parse(oidcStorage);
      const accessToken = userData.access_token;
      const expiry = userData.expires_at;

      // Check if token exists and hasn't expired
      if (accessToken && expiry && new Date().getTime() / 1000 < expiry) {
        return true;
      }
    }
  } catch (error) {
    console.warn('Failed to check auth status from storage:', error);
  }

  return false;
}