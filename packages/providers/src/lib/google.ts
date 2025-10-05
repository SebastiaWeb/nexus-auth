/**
 * @module @nexus-auth/providers
 * Google OAuth Provider
 */

import { OAuth2Provider, type OAuthUserProfile } from '@nexus-auth/core';

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Custom callback URL (optional)
   * Default: http://localhost:3000/api/auth/callback/google
   */
  callbackUrl?: string;
}

/**
 * Google OAuth2 Provider
 *
 * @example
 * ```typescript
 * import { GoogleProvider } from '@nexus-auth/providers';
 *
 * const auth = new NexusAuth({
 *   providers: [
 *     GoogleProvider({
 *       clientId: process.env.GOOGLE_ID!,
 *       clientSecret: process.env.GOOGLE_SECRET!,
 *     }),
 *   ],
 * });
 * ```
 */
export function GoogleProvider(config: GoogleProviderConfig): OAuth2Provider {
  return new OAuth2Provider(
    'google',
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
      profile: (profile): OAuthUserProfile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: profile.picture,
      }),
    },
    config.callbackUrl
  );
}
