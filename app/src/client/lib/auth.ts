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
    // Get the OIDC authority and client ID from env vars
    const authority = import.meta.env.VITE_OIDC_AUTHORITY || 'https://your-oidc-provider.com';
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'your-client-id';
    
    console.log('Auth Debug - Authority:', authority);
    console.log('Auth Debug - Client ID:', clientId);
    
    // Try different storage key patterns
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
    
    console.log('Auth Debug - Trying storage keys:', possibleKeys);
    
    let oidcStorage = null;
    let usedKey = null;
    
    // Try localStorage first
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        console.log('Auth Debug - Found data in localStorage with key:', key);
        oidcStorage = data;
        usedKey = key;
        break;
      }
    }
    
    // If not found in localStorage, try sessionStorage
    if (!oidcStorage) {
      for (const key of possibleKeys) {
        const data = sessionStorage.getItem(key);
        if (data) {
          console.log('Auth Debug - Found data in sessionStorage with key:', key);
          oidcStorage = data;
          usedKey = key;
          break;
        }
      }
    }
    
    console.log('Auth Debug - Storage data exists:', !!oidcStorage);
    console.log('Auth Debug - Used storage key:', usedKey);
    
    // Debug: show all localStorage keys that contain 'oidc'
    console.log('Auth Debug - All OIDC keys in localStorage:');
    const allLocalKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allLocalKeys.push(key);
        if (key.includes('oidc')) {
          console.log('  - localStorage OIDC key:', key);
          // Also show a preview of the data
          try {
            const data = localStorage.getItem(key);
            if (data) {
              console.log('    Data preview:', data.substring(0, 100) + '...');
            }
          } catch {
            console.log('    Data: [unable to preview]');
          }
        }
      }
    }
    console.log('Auth Debug - Total localStorage keys:', allLocalKeys.length);
    console.log('Auth Debug - All localStorage keys:', allLocalKeys);
    
    // Check sessionStorage too
    console.log('Auth Debug - All OIDC keys in sessionStorage:');
    const allSessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        allSessionKeys.push(key);
        if (key.includes('oidc')) {
          console.log('  - sessionStorage OIDC key:', key);
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              console.log('    Data preview:', data.substring(0, 100) + '...');
            }
          } catch {
            console.log('    Data: [unable to preview]');
          }
        }
      }
    }
    console.log('Auth Debug - Total sessionStorage keys:', allSessionKeys.length);
    console.log('Auth Debug - All sessionStorage keys:', allSessionKeys);
    
    // Also check if there are any keys with user profile data in either storage
    const userLocalKeys = allLocalKeys.filter(key => key.includes('user') || key.includes('profile') || key.includes('auth'));
    const userSessionKeys = allSessionKeys.filter(key => key.includes('user') || key.includes('profile') || key.includes('auth'));
    console.log('Auth Debug - User-related localStorage keys:', userLocalKeys);
    console.log('Auth Debug - User-related sessionStorage keys:', userSessionKeys);

    if (oidcStorage) {
      const userData = JSON.parse(oidcStorage);
      
      // Log all available tokens for debugging
      console.log('Auth Debug - Available tokens:', {
        access_token: !!userData.access_token,
        id_token: !!userData.id_token,
        token_type: userData.token_type
      });
      
      // Try access token first, then id token as fallback
      const accessToken = userData.access_token || userData.id_token;
      console.log('Auth Debug - Using token type:', userData.access_token ? 'access_token' : 'id_token');
      console.log('Auth Debug - Token preview:', accessToken ? accessToken.substring(0, 50) + '...' : 'none');

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