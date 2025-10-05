/**
 * @module @nexus-auth/providers
 * Microsoft OAuth Provider
 */

import { OAuth2Provider, type OAuthUserProfile } from '@nexus-auth/core';

export interface MicrosoftProviderConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Tenant ID for Microsoft Azure AD
   * Use 'common' for multi-tenant, 'organizations' for work/school accounts only,
   * 'consumers' for personal accounts only, or a specific tenant ID
   * Default: 'common'
   */
  tenant?: string;
  /**
   * Custom callback URL (optional)
   * Default: http://localhost:3000/api/auth/callback/microsoft
   */
  callbackUrl?: string;
}

/**
 * Microsoft OAuth2 Provider (Azure AD / Microsoft Account)
 *
 * @example
 * ```typescript
 * import { MicrosoftProvider } from '@nexus-auth/providers';
 *
 * const auth = new NexusAuth({
 *   providers: [
 *     MicrosoftProvider({
 *       clientId: process.env.MICROSOFT_ID!,
 *       clientSecret: process.env.MICROSOFT_SECRET!,
 *       tenant: 'common', // or 'organizations', 'consumers', or specific tenant ID
 *     }),
 *   ],
 * });
 * ```
 */
export function MicrosoftProvider(config: MicrosoftProviderConfig): OAuth2Provider {
  const tenant = config.tenant || 'common';

  return new OAuth2Provider(
    'microsoft',
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid email profile User.Read',
      profile: (profile): OAuthUserProfile => ({
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        image: null, // Microsoft Graph requires separate call for photo
      }),
    },
    config.callbackUrl
  );
}
