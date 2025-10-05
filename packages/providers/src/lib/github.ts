/**
 * @module @nexus-auth/providers
 * GitHub OAuth Provider
 */

import { OAuth2Provider, type OAuthUserProfile } from '@nexusauth/core';

export interface GitHubProviderConfig {
  clientId: string;
  clientSecret: string;
  /**
   * Custom callback URL (optional)
   * Default: http://localhost:3000/api/auth/callback/github
   */
  callbackUrl?: string;
}

/**
 * GitHub OAuth2 Provider
 *
 * @example
 * ```typescript
 * import { GitHubProvider } from '@nexusauth/providers';
 *
 * const auth = new NexusAuth({
 *   providers: [
 *     GitHubProvider({
 *       clientId: process.env.GITHUB_ID!,
 *       clientSecret: process.env.GITHUB_SECRET!,
 *     }),
 *   ],
 * });
 * ```
 */
export function GitHubProvider(config: GitHubProviderConfig): OAuth2Provider {
  return new OAuth2Provider(
    'github',
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scope: 'read:user user:email',
      profile: (profile): OAuthUserProfile => ({
        id: profile.id.toString(),
        email: profile.email,
        name: profile.name || profile.login,
        image: profile.avatar_url,
      }),
    },
    config.callbackUrl
  );
}
