import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { JWTPayload } from 'jose';

// User type for JWT payload
export interface AuthenticatedUser extends JWTPayload {
  email?: string;
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

// Extend Express Request interface to include user information
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface AuthConfig {
  jwksUri: string;
  issuer: string;
  audience?: string;
}

class AuthService {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private config: AuthConfig | null = null;

  /**
   * Initialize the auth service with OIDC configuration
   */
  public initialize(config: AuthConfig) {
    this.config = config;
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
    console.log(`Auth service initialized with issuer: ${config.issuer}`);
  }

  /**
   * Verify and decode a JWT token
   */
  public async verifyToken(token: string): Promise<JWTPayload> {
    if (!this.jwks || !this.config) {
      throw new Error('Auth service not initialized. Call initialize() first.');
    }

    try {
      console.log('Attempting to verify JWT token...');
      console.log('Token preview:', token.substring(0, 50) + '...');
      console.log('Expected issuer:', this.config.issuer);
      console.log('Expected audience:', this.config.audience);

      const verifyOptions: {
        issuer: string;
        audience?: string;
      } = {
        issuer: this.config.issuer,
      };

      // Only add audience if it's configured
      if (this.config.audience) {
        verifyOptions.audience = this.config.audience;
      }

      const { payload } = await jwtVerify(token, this.jwks, verifyOptions);

      console.log('JWT verification successful for user:', payload.email || payload.sub);
      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  private extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const match = authHeader.match(/Bearer\s+(.+)/i);
    return match ? match[1] : null;
  }

  /**
   * Express middleware to authenticate requests
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(`Auth middleware called for: ${req.method} ${req.path}`);
      console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
      
      const token = this.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        console.log('No token found in request');
        res.status(401).json({ 
          error: 'Authentication required', 
          message: 'No token provided' 
        });
        return;
      }

      console.log('Token found, attempting verification...');
      const payload = await this.verifyToken(token);
      
      // Attach user information to request
      req.user = payload as AuthenticatedUser;

      // Log user email for debugging (as requested)
      console.log(`Authenticated request from user: ${req.user.email || req.user.sub} - ${req.method} ${req.path}`);
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ 
        error: 'Authentication failed', 
        message: error instanceof Error ? error.message : 'Invalid token' 
      });
    }
  };

  /**
   * Middleware to optionally authenticate requests (doesn't fail if no token)
   */
  public optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const payload = await this.verifyToken(token);
        req.user = payload as AuthenticatedUser;
        
        console.log(`Optionally authenticated request from user: ${req.user.email || req.user.sub} - ${req.method} ${req.path}`);
      }
      
      next();
    } catch (error) {
      // For optional auth, we don't fail the request if token is invalid
      console.warn('Optional authentication failed:', error);
      next();
    }
  };
}

// Export singleton instance
export const authService = new AuthService();

// Export middleware functions for easier import
export const requireAuth = authService.authenticate;
export const optionalAuth = authService.optionalAuthenticate;