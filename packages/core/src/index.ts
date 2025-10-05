/**
 * Welcome to @nexus-auth/core!
 *
 * This is the main entry point of the package.
 * It exports the main NexusAuth class and all the core types.
 */

// --- Main Class ---
export { NexusAuth } from './lib/nexus-auth.js';

// --- Core Types ---
export type {
  BaseAdapter,
  User,
  Account,
  Session,
} from './lib/types.js';

// --- Config Types ---
export type {
  NexusAuthConfig,
  JWT,
  Events,
  Callbacks,
} from './lib/config.js';

// --- JWT Types ---
export type { JWTAlgorithm } from './lib/jwt.js';

// --- Provider Types ---
export type {
  Provider,
  OAuthProvider,
  CredentialsProvider,
  CredentialsInput,
  OAuthUserProfile,
  OAuth2Config,
} from './lib/provider.js';

export { OAuth2Provider } from './lib/provider.js';