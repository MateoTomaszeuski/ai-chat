import type { UserManagerSettings } from 'oidc-client-ts';

// You'll need to replace these with your actual OIDC provider settings
export const oidcConfig: UserManagerSettings = {
  // Replace with your OIDC authority (e.g., Auth0, Keycloak, Azure AD, etc.)
  authority: import.meta.env.VITE_OIDC_AUTHORITY || 'https://your-oidc-provider.com',
  
  // Your client ID from the OIDC provider
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID || 'your-client-id',
  
  // Redirect URIs - these need to match what's configured in your OIDC provider
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-refresh`,
  
  // Response type for Authorization Code flow with PKCE
  response_type: 'code',
  
  // Scopes to request
  scope: 'openid profile email',
  
  // Enable PKCE (Proof Key for Code Exchange) for better security
  response_mode: 'query',
  
  // Additional settings
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  loadUserInfo: true,
  
  // Metadata about the OIDC provider (optional - can be auto-discovered)
  // These would be auto-discovered from the authority/.well-known/openid_configuration endpoint
  metadataUrl: import.meta.env.VITE_OIDC_METADATA_URL,
};

// Types for user profile
export interface UserProfile {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: unknown;
}