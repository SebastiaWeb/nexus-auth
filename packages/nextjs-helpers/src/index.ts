/**
 * @module @nexusauth/nextjs-helpers
 * Next.js Helpers for NexusAuth
 */

// App Router helpers
export {
  getSession,
  getCurrentUser,
  requireAuth,
  signOut,
} from './lib/app-router.js';

// Pages Router helpers
export {
  getSessionFromReq,
  getCurrentUserFromReq,
  withAuth,
  withAuthSSR,
  handleSignOut,
} from './lib/pages-router.js';

// Middleware helpers
export {
  createAuthMiddleware,
  getSessionFromMiddleware,
  type AuthMiddlewareConfig,
} from './lib/middleware.js';
