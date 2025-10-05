import { createAuthMiddleware, requireAuth, optionalAuth } from '@nexus-auth/express-helpers';
import { nexusAuth } from '../config/nexus-auth';

export const authenticate = createAuthMiddleware(nexusAuth);

export const requireAuthentication = requireAuth(nexusAuth);

export const optionalAuthentication = optionalAuth(nexusAuth);
