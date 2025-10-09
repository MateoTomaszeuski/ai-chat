/**
 * Authentication configuration for the backend
 * These settings should match your OIDC provider configuration
 */

interface AuthConfig {
  jwksUri: string;
  issuer: string;
  audience?: string;
}

export function getAuthConfig(): AuthConfig {
  const issuer = process.env.OIDC_ISSUER;
  const audience = process.env.OIDC_AUDIENCE;

  if (!issuer) {
    throw new Error('OIDC_ISSUER environment variable is required');
  }

  // Construct JWKS URI from issuer if not explicitly provided
  const jwksUri = process.env.OIDC_JWKS_URI || `${issuer}/.well-known/jwks.json`;

  return {
    jwksUri,
    issuer,
    audience,
  };
}

// For development/testing - you can set these based on your OIDC provider
export const defaultAuthConfig: AuthConfig = {
  // Example for Auth0: https://your-domain.auth0.com/.well-known/jwks.json
  // Example for Keycloak: https://your-keycloak.com/auth/realms/your-realm/.well-known/jwks.json
  jwksUri: process.env.OIDC_JWKS_URI || 'https://your-oidc-provider.com/.well-known/jwks.json',
  issuer: process.env.OIDC_ISSUER || 'https://your-oidc-provider.com',
  audience: process.env.OIDC_AUDIENCE, // Optional - depends on your OIDC provider
};