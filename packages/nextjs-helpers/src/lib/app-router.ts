/**
 * @module @nexus-auth/nextjs-helpers
 * Next.js App Router Helpers
 */

import { cookies } from 'next/headers';

/**
 * Get session from App Router (Server Components, Server Actions, Route Handlers)
 *
 * @example
 * ```typescript
 * import { auth } from './auth';
 * import { getSession } from '@nexusauth/nextjs-helpers';
 *
 * export default async function Page() {
 *   const session = await getSession(auth);
 *   if (!session) return <div>Not authenticated</div>;
 *   return <div>Welcome {session.user.name}</div>;
 * }
 * ```
 */
export async function getSession(nexusAuth: any) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('nexus.session-token')?.value;

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
 * Get current user from App Router
 *
 * @example
 * ```typescript
 * import { auth } from './auth';
 * import { getCurrentUser } from '@nexusauth/nextjs-helpers';
 *
 * export default async function ProfilePage() {
 *   const user = await getCurrentUser(auth);
 *   if (!user) return redirect('/login');
 *   return <div>{user.email}</div>;
 * }
 * ```
 */
export async function getCurrentUser(nexusAuth: any): Promise<any | null> {
  const session = await getSession(nexusAuth);
  return session?.user || null;
}

/**
 * Protect App Router Server Components/Actions
 * Throws an error if user is not authenticated
 *
 * @example
 * ```typescript
 * import { auth } from './auth';
 * import { requireAuth } from '@nexusauth/nextjs-helpers';
 *
 * export default async function ProtectedPage() {
 *   await requireAuth(auth);
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export async function requireAuth(nexusAuth: any): Promise<any> {
  const user = await getCurrentUser(nexusAuth);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Sign out from App Router (Server Actions)
 *
 * @example
 * ```typescript
 * // app/actions.ts
 * 'use server';
 * import { auth } from './auth';
 * import { signOut } from '@nexusauth/nextjs-helpers';
 *
 * export async function handleSignOut() {
 *   await signOut(auth);
 * }
 * ```
 */
export async function signOut(nexusAuth: any): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('nexus.session-token')?.value;

  if (sessionToken) {
    await nexusAuth.adapter.deleteSession(sessionToken);
  }

  cookieStore.delete('nexus.session-token');
}
