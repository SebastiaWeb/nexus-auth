/**
 * @module @nexusauth/core
 */

/**
 * Represents the standardized user profile information returned by an OAuth provider.
 * Each provider adapter is responsible for mapping the provider-specific payload
 * to this shape.
 */
export interface OAuthUserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * The OAuthProvider interface defines the contract for any OAuth provider
 * (e.g., Google, GitHub). This is another "Port" in our hexagonal architecture,
 * allowing the core to be decoupled from the specifics of each OAuth implementation.
 */
export interface OAuthProvider {
  /**
   * A unique identifier for the provider (e.g., 'google', 'github').
   */
  id: string;

  /**
   * The type of provider
   */
  type: 'oauth';

  /**
   * Returns the URL to which the user should be redirected to start the
   * authentication process.
   *
   * @param options - Provider-specific options, like `scope` or `state`.
   */
  getAuthorizationUrl(options?: Record<string, any>): Promise<string>;

  /**
   * Takes an authorization code from the provider's callback and exchanges it
   * for the user's profile information.
   *
   * @param code - The authorization code returned by the provider.
   */
  getUserProfile(code: string): Promise<OAuthUserProfile>;
}

/**
 * Credentials for email/password authentication
 */
export interface CredentialsInput {
  email: string;
  password: string;
  name?: string;
}

/**
 * Authorize function for credentials provider
 */
export type CredentialsAuthorize = (
  credentials: CredentialsInput
) => Promise<{ email: string; name?: string; id?: string } | null>;

/**
 * The CredentialsProvider interface for email/password authentication
 */
export interface CredentialsProvider {
  /**
   * A unique identifier for the provider (e.g., 'credentials').
   */
  id: string;

  /**
   * The type of provider
   */
  type: 'credentials';

  /**
   * Optional authorize function for custom credential validation
   * If not provided, NexusAuth will use default email/password logic
   */
  authorize?: CredentialsAuthorize;
}

/**
 * Union type for all provider types
 */
export type Provider = OAuthProvider | CredentialsProvider;

/**
 * Configuration for OAuth2 providers
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  /**
   * OAuth2 authorization endpoint
   */
  authorizationUrl: string;
  /**
   * OAuth2 token endpoint
   */
  tokenUrl: string;
  /**
   * OAuth2 user info endpoint
   */
  userInfoUrl: string;
  /**
   * OAuth2 scopes
   */
  scope?: string;
  /**
   * Custom profile mapper
   */
  profile?: (profile: any) => OAuthUserProfile;
}

/**
 * Internal OAuth2 provider implementation
 */
export class OAuth2Provider implements OAuthProvider {
  public id: string;
  public type: 'oauth' = 'oauth';
  private config: OAuth2Config;
  private callbackUrl: string;

  constructor(id: string, config: OAuth2Config, callbackUrl?: string) {
    this.id = id;
    this.config = config;
    this.callbackUrl = callbackUrl || `http://localhost:3000/api/auth/callback/${id}`;
  }

  async getAuthorizationUrl(options?: { state?: string }): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: this.config.scope || '',
      ...(options?.state && { state: options.state }),
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async getUserProfile(code: string): Promise<OAuthUserProfile> {
    // Exchange code for access token
    const tokenResponse = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string };
    const accessToken = tokens.access_token;

    // Get user profile
    const profileResponse = await fetch(this.config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to get user profile: ${profileResponse.statusText}`);
    }

    const profile = await profileResponse.json() as any;

    // Map profile to OAuthUserProfile
    if (this.config.profile) {
      return this.config.profile(profile);
    }

    // Default mapping
    return {
      id: profile.id || profile.sub,
      email: profile.email,
      name: profile.name,
      image: profile.picture || profile.avatar_url,
    };
  }
}
