/**
 * @module @nexus-auth/nextjs-helpers
 * Next.js Middleware Helpers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Configuration for authentication middleware
 */
export interface AuthMiddlewareConfig {
  /**
   * Public routes that don't require authentication
   * @example ['/login', '/register', '/']
   */
  publicRoutes?: string[];

  /**
   * Routes that require authentication
   * @example ['/dashboard', '/profile']
   */
  protectedRoutes?: string[];

  /**
   * Redirect URL for unauthenticated users
   * @default '/login'
   */
  loginUrl?: string;

  /**
   * Redirect URL for authenticated users accessing public routes
   * @default '/dashboard'
   */
  defaultAuthRedirect?: string;
}

/**
 * Create Next.js middleware for authentication
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { auth } from './auth';
 * import { createAuthMiddleware } from '@nexus-auth/nextjs-helpers';
 *
 * export const middleware = createAuthMiddleware(auth, {
 *   publicRoutes: ['/', '/login', '/register'],
 *   protectedRoutes: ['/dashboard', '/profile'],
 *   loginUrl: '/login',
 * });
 *
 * export const config = {
 *   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
 * };
 * ```
 */
export function createAuthMiddleware(
  nexusAuth: any,
  config: AuthMiddlewareConfig = {}
) {
  const {
    publicRoutes = ['/'],
    protectedRoutes = [],
    loginUrl = '/login',
    defaultAuthRedirect = '/dashboard',
  } = config;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get session token from cookies
    const sessionToken = request.cookies.get('nexus.session-token')?.value;

    // Check if route is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // If no session token and accessing protected route
    if (!sessionToken && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = loginUrl;
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // If session exists, validate it
    if (sessionToken) {
      try {
        const result = await nexusAuth.adapter.getSessionAndUser(sessionToken);

        if (result && result.session.expires > new Date()) {
          // Valid session - allow authenticated users to access protected routes
          if (isProtectedRoute) {
            return NextResponse.next();
          }

          // Redirect authenticated users from login page to dashboard
          if (pathname === loginUrl) {
            return NextResponse.redirect(new URL(defaultAuthRedirect, request.url));
          }
        } else {
          // Invalid or expired session
          if (isProtectedRoute) {
            const url = request.nextUrl.clone();
            url.pathname = loginUrl;
            url.searchParams.set('callbackUrl', pathname);

            const response = NextResponse.redirect(url);
            response.cookies.delete('nexus.session-token');
            return response;
          }
        }
      } catch (error) {
        // Session validation error
        if (isProtectedRoute) {
          const url = request.nextUrl.clone();
          url.pathname = loginUrl;

          const response = NextResponse.redirect(url);
          response.cookies.delete('nexus.session-token');
          return response;
        }
      }
    }

    return NextResponse.next();
  };
}

/**
 * Simple authentication check for middleware
 * Returns user if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { auth } from './auth';
 * import { getSessionFromMiddleware } from '@nexus-auth/nextjs-helpers';
 *
 * export async function middleware(request: NextRequest) {
 *   const session = await getSessionFromMiddleware(auth, request);
 *
 *   if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
 *     return NextResponse.redirect(new URL('/login', request.url));
 *   }
 *
 *   return NextResponse.next();
 * }
 * ```
 */
export async function getSessionFromMiddleware(nexusAuth: any, request: NextRequest) {
  const sessionToken = request.cookies.get('nexus.session-token')?.value;

  if (!sessionToken) return null;

  try {
    const result = await nexusAuth.adapter.getSessionAndUser(sessionToken);

    if (!result || result.session.expires < new Date()) {
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
}
