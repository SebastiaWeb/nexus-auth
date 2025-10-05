/**
 * @module @nexusauth/nextjs-helpers
 * Next.js Pages Router Helpers
 */

import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

/**
 * Get session from Pages Router (getServerSideProps, API routes)
 *
 * @example
 * ```typescript
 * // pages/profile.tsx
 * import { auth } from '../auth';
 * import { getSessionFromReq } from '@nexusauth/nextjs-helpers';
 *
 * export const getServerSideProps = async (ctx) => {
 *   const session = await getSessionFromReq(auth, ctx.req);
 *   if (!session) {
 *     return { redirect: { destination: '/login', permanent: false } };
 *   }
 *   return { props: { user: session.user } };
 * };
 * ```
 */
export async function getSessionFromReq(
  nexusAuth: any,
  req: NextApiRequest | GetServerSidePropsContext['req']
) {
  const sessionToken = req.cookies['nexus.session-token'];

  if (!sessionToken) return null;

  const result = await nexusAuth.adapter.getSessionAndUser(sessionToken);
  if (!result) return null;

  const { session, user } = result;

  // Check if session is expired
  if (session.expires < new Date()) {
    await nexusAuth.adapter.deleteSession(sessionToken);
    return null;
  }

  return { session, user };
}

/**
 * Get current user from Pages Router
 *
 * @example
 * ```typescript
 * export const getServerSideProps = async (ctx) => {
 *   const user = await getCurrentUserFromReq(auth, ctx.req);
 *   if (!user) {
 *     return { redirect: { destination: '/login', permanent: false } };
 *   }
 *   return { props: { user } };
 * };
 * ```
 */
export async function getCurrentUserFromReq(
  nexusAuth: any,
  req: NextApiRequest | GetServerSidePropsContext['req']
): Promise<any | null> {
  const session = await getSessionFromReq(nexusAuth, req);
  return session?.user || null;
}

/**
 * Protect API routes
 *
 * @example
 * ```typescript
 * // pages/api/protected.ts
 * import { auth } from '../../auth';
 * import { withAuth } from '@nexusauth/nextjs-helpers';
 *
 * export default withAuth(auth, async (req, res, user) => {
 *   res.json({ message: `Hello ${user.name}` });
 * });
 * ```
 */
export function withAuth(
  nexusAuth: any,
  handler: (req: NextApiRequest, res: NextApiResponse, user: any) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await getCurrentUserFromReq(nexusAuth, req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return handler(req, res, user);
  };
}

/**
 * Protect getServerSideProps
 *
 * @example
 * ```typescript
 * // pages/dashboard.tsx
 * import { auth } from '../auth';
 * import { withAuthSSR } from '@nexusauth/nextjs-helpers';
 *
 * export const getServerSideProps = withAuthSSR(auth, async (ctx, user) => {
 *   return { props: { user } };
 * });
 * ```
 */
export function withAuthSSR<P extends Record<string, any> = Record<string, any>>(
  nexusAuth: any,
  handler: (ctx: GetServerSidePropsContext, user: any) => Promise<{ props: P } | { redirect: any }>
) {
  return async (ctx: GetServerSidePropsContext) => {
    const user = await getCurrentUserFromReq(nexusAuth, ctx.req);

    if (!user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    return handler(ctx, user);
  };
}

/**
 * Sign out from Pages Router (API route)
 *
 * @example
 * ```typescript
 * // pages/api/auth/signout.ts
 * import { auth } from '../../../auth';
 * import { handleSignOut } from '@nexusauth/nextjs-helpers';
 *
 * export default async function handler(req, res) {
 *   await handleSignOut(auth, req, res);
 *   res.redirect('/');
 * }
 * ```
 */
export async function handleSignOut(
  nexusAuth: any,
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const sessionToken = req.cookies['nexus.session-token'];

  if (sessionToken) {
    await nexusAuth.adapter.deleteSession(sessionToken);
  }

  res.setHeader('Set-Cookie', 'nexus.session-token=; Path=/; HttpOnly; Max-Age=0');
}
