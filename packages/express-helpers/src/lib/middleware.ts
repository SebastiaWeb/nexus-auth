/**
 * @module @nexus-auth/express-helpers
 * Express Middleware for NexusAuth
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Extend Express Request to include user and session
 */
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

/**
 * Options for authentication middleware
 */
export interface AuthMiddlewareOptions {
  /**
   * Whether to require authentication (default: true)
   * If false, middleware will attach user if present but won't block unauthenticated requests
   */
  required?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error, req: Request, res: Response, next: NextFunction) => void;

  /**
   * Custom unauthorized handler
   */
  onUnauthorized?: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Create authentication middleware for Express
 * Validates session from cookies and attaches user to request
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import cookieParser from 'cookie-parser';
 * import { auth } from './auth';
 * import { createAuthMiddleware } from '@nexus-auth/express-helpers';
 *
 * const app = express();
 * app.use(cookieParser());
 *
 * // Protect all routes
 * app.use(createAuthMiddleware(auth));
 *
 * // Or protect specific routes
 * app.get('/protected', createAuthMiddleware(auth), (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function createAuthMiddleware(nexusAuth: any, options: AuthMiddlewareOptions = {}) {
  const { required = true, onError, onUnauthorized } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.cookies?.['nexus.session-token'];

      if (!sessionToken) {
        if (required) {
          if (onUnauthorized) {
            return onUnauthorized(req, res, next);
          }
          return res.status(401).json({ error: 'Unauthorized' });
        }
        return next();
      }

      const result = await nexusAuth.adapter.getSessionAndUser(sessionToken);

      if (!result) {
        if (required) {
          if (onUnauthorized) {
            return onUnauthorized(req, res, next);
          }
          return res.status(401).json({ error: 'Invalid session' });
        }
        return next();
      }

      const { session, user } = result;

      // Check if session is expired
      if (session.expires < new Date()) {
        await nexusAuth.adapter.deleteSession(sessionToken);
        if (required) {
          if (onUnauthorized) {
            return onUnauthorized(req, res, next);
          }
          return res.status(401).json({ error: 'Session expired' });
        }
        return next();
      }

      // Attach user and session to request
      req.user = user;
      req.session = session;

      next();
    } catch (error) {
      if (onError) {
        return onError(error as Error, req, res, next);
      }
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Create optional authentication middleware
 * Attaches user if present but doesn't block unauthenticated requests
 *
 * @example
 * ```typescript
 * app.get('/public', optionalAuth(auth), (req, res) => {
 *   if (req.user) {
 *     res.json({ message: `Hello ${req.user.name}` });
 *   } else {
 *     res.json({ message: 'Hello guest' });
 *   }
 * });
 * ```
 */
export function optionalAuth(nexusAuth: any) {
  return createAuthMiddleware(nexusAuth, { required: false });
}

/**
 * Create required authentication middleware
 * Blocks all unauthenticated requests
 *
 * @example
 * ```typescript
 * app.get('/protected', requireAuth(auth), (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function requireAuth(nexusAuth: any, options?: Omit<AuthMiddlewareOptions, 'required'>) {
  return createAuthMiddleware(nexusAuth, { ...options, required: true });
}

/**
 * Get current user from request
 * Helper function to extract user with type safety
 *
 * @example
 * ```typescript
 * app.get('/me', requireAuth(auth), (req, res) => {
 *   const user = getCurrentUser(req);
 *   res.json({ user });
 * });
 * ```
 */
export function getCurrentUser(req: Request): any | null {
  return req.user || null;
}

/**
 * Get current session from request
 *
 * @example
 * ```typescript
 * app.get('/session', requireAuth(auth), (req, res) => {
 *   const session = getCurrentSession(req);
 *   res.json({ session });
 * });
 * ```
 */
export function getCurrentSession(req: Request): any | null {
  return req.session || null;
}

/**
 * Sign out user (delete session)
 *
 * @example
 * ```typescript
 * app.post('/logout', requireAuth(auth), async (req, res) => {
 *   await signOut(auth, req, res);
 *   res.json({ message: 'Logged out' });
 * });
 * ```
 */
export async function signOut(nexusAuth: any, req: Request, res: Response): Promise<void> {
  const sessionToken = req.cookies?.['nexus.session-token'];

  if (sessionToken) {
    await nexusAuth.adapter.deleteSession(sessionToken);
  }

  res.clearCookie('nexus.session-token');

  // Clear user and session from request
  req.user = undefined;
  req.session = undefined;
}
