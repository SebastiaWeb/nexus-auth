import type { Account, BaseAdapter, Session, User } from './types.js';
import type { Provider } from './provider.js';
import type { JWTAlgorithm } from './jwt.js';

/** A simple type for the decoded JSON Web Token. */
export type JWT = {
  /** Subject (user ID) */
  sub?: string;
  /** User email */
  email?: string;
  /** User name */
  name?: string;
  /** User profile picture */
  picture?: string;
  /** Issued at (timestamp) */
  iat?: number;
  /** Expiration time (timestamp) */
  exp?: number;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string;
  /** Custom claims */
  [key: string]: any;
};

/**
 * Defines the mapping between nexus-auth's internal data model
 * and a user's custom database schema.
 */
export interface AdapterSchemaMapping {
  user: { [key: string]: string };
  session: { [key: string]: string };
  account: { [key: string]: string };
}

/**
 * Configuration for an adapter when using a custom, pre-existing
 * database schema.
 */
export interface CustomAdapterConfig {
  entities?: {
    user: any;
    session: any;
    account: any;
  };
  mapping: AdapterSchemaMapping;
}

/**
 * A map of functions that are called for side-effects at specific points
 * in the authentication lifecycle.
 */
export interface Events {
  signIn: (message: { user: User; account: Account | null }) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (message: { user: User }) => Promise<void>;
  linkAccount: (message: { user: User; account: Account }) => Promise<void>;
}

/**
 * A map of functions that can be used to control or modify the
 * default behavior of nexus-auth.
 */
export interface Callbacks {
  jwt: (message: { token: JWT; user?: User }) => Promise<JWT>;
  session: (message: { session: Session; token: JWT }) => Promise<Session>;
}

/**
 * Main configuration object for the NexusAuth function.
 */
export interface NexusAuthConfig {
  adapter: BaseAdapter;
  providers: Provider[];
  secret: string;
  session?: {
    strategy?: 'jwt' | 'database';
    maxAge?: number; // in seconds
    refreshToken?: {
      enabled?: boolean;
      maxAge?: number; // in seconds, default 30 days
    };
  };
  jwt?: {
    algorithm?: JWTAlgorithm;
    issuer?: string;
    audience?: string;
  };

  /**
   * A map of functions that are called for side-effects.
   */
  events?: Partial<Events>;

  /**
   * Callbacks are functions that can be used to control or modify
   * the default behavior.
   */
  callbacks?: Partial<Callbacks>;
}
