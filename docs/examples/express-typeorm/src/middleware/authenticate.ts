import { createAuthMiddleware, requireAuth, optionalAuth } from '@nexusauth/express-helpers';
import { nexusAuth } from '../config/nexus-auth';

export const authenticate = createAuthMiddleware(nexusAuth);

export const requireAuthentication = requireAuth(nexusAuth);

export const optionalAuthentication = optionalAuth(nexusAuth);
