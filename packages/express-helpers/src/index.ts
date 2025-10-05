/**
 * @module @nexus-auth/express-helpers
 * Express Helpers for NexusAuth
 */

// Middleware
export {
  createAuthMiddleware,
  optionalAuth,
  requireAuth,
  getCurrentUser,
  getCurrentSession,
  signOut,
  type AuthMiddlewareOptions,
} from './lib/middleware.js';
