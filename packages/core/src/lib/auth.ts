import type { NexusAuthConfig, Events, Callbacks, JWT } from './config.js';
import type { BaseAdapter } from './types.js';
import type { Provider } from './provider.js';
import type { NexusAuthRequest } from './request.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * The main class that orchestrates the authentication flow.
 */
export class NexusAuth {
  readonly config: NexusAuthConfig;
  readonly adapter: BaseAdapter;
  readonly providers: Provider[];
  readonly events: Partial<Events>;
  readonly callbacks: Partial<Callbacks>;

  constructor(config: NexusAuthConfig) {
    this.config = this.validateAndMergeConfig(config);
    this.adapter = this.config.adapter;
    this.providers = this.config.providers;
    this.events = this.config.events || {};
    this.callbacks = this.config.callbacks || {};
  }

  /**
   * Validates the user-provided configuration and merges it with defaults.
   * @param config The user-provided configuration.
   * @returns A validated and merged configuration object.
   */
  private validateAndMergeConfig(config: NexusAuthConfig): NexusAuthConfig {
    if (!config) {
      throw new Error('Configuration is required.');
    }
    if (!config.secret) {
      throw new Error('A secret is required for signing tokens.');
    }
    if (!config.adapter) {
      throw new Error('An adapter is required for database operations.');
    }
    if (!config.providers || config.providers.length === 0) {
      throw new Error('At least one provider is required.');
    }

    // Merge with default session settings
    const session = {
      strategy: 'jwt' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      ...config.session,
    };

    return {
      ...config,
      session,
    };
  }

  /**
   * Handles an incoming request to extract and verify the session.
   * @param request A framework-agnostic request object.
   * @returns The decoded session payload or null if invalid.
   */
  public async handleRequest(request: NexusAuthRequest): Promise<JWT | null> {
    // 1. Extract token from cookie or header
    let token: string | null = null;
    const sessionCookie = request.cookies?.['nexus-auth.session-token'];
    if (sessionCookie) {
      token = sessionCookie;
    } else {
      const authHeader = request.headers?.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // 2. Verify the token
    const decoded = this.verifyJwt(token);
    if (!decoded) {
      return null;
    }

    // 3. TODO: Implement session callback for enrichment

    return decoded;
  }

  /**
   * Generates a JSON Web Token.
   * @param payload The payload to include in the token.
   * @returns A signed JWT.
   */
  public generateJwt(payload: Record<string, unknown>): string {
    const secret = this.config.secret;
    const maxAge = this.config.session?.maxAge;
    return jwt.sign(payload, secret, { expiresIn: maxAge });
  }

  /**
   * Verifies a JSON Web Token.
   * @param token The JWT to verify.
   * @returns The decoded payload if the token is valid.
   */
  public verifyJwt(token: string): JWT | null {
    const secret = this.config.secret;
    try {
      const decoded = jwt.verify(token, secret);
      return decoded as JWT;
    } catch (error) {
      // TODO: Add logging for failed verification
      return null;
    }
  }

  /**
   * Hashes a password using bcrypt.
   * @param password The plain-text password to hash.
   * @returns A salted and hashed password.
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compares a plain-text password with a hash.
   * @param password The plain-text password.
   * @param hash The hashed password to compare against.
   * @returns True if the passwords match.
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Placeholder for future methods
  async signIn() {
    // TODO: Implement sign-in logic
  }

  async signOut() {
    // TODO: Implement sign-out logic
  }

  async register() {
    // TODO: Implement registration logic
  }
}

/**
 * Factory function to initialize NexusAuth.
 * @param config The configuration object.
 * @returns An instance of the NexusAuth class.
 */
export function NexusAuthFactory(config: NexusAuthConfig): NexusAuth {
  return new NexusAuth(config);
}
