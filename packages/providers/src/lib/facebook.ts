/**
 * @module @nexusauth/providers
 * Facebook OAuth Provider
 */

import { OAuth2Provider, type OAuthUserProfile } from '@nexusauth/core';

export interface FacebookProviderConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Custom callback URL (optional)
   * Default: http://localhost:3000/api/auth/callback/facebook
   */
  callbackUrl?: string;
}

/**
 * Facebook OAuth2 Provider
 *
 * @example
 * ```typescript
 * import { FacebookProvider } from '@nexusauth/providers';
 *
 * const auth = new NexusAuth({
 *   providers: [
 *     FacebookProvider({
 *       clientId: process.env.FACEBOOK_ID!,
 *       clientSecret: process.env.FACEBOOK_SECRET!,
 *     }),
 *   ],
 * });
 * ```
 */
export function FacebookProvider(config: FacebookProviderConfig): OAuth2Provider {
  return new OAuth2Provider(
    'facebook',
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
      scope: 'email public_profile',
      profile: (profile): OAuthUserProfile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: profile.picture?.data?.url || null,
      }),
    },
    config.callbackUrl
  );
}
