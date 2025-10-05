import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

const authMiddleware = createAuthMiddleware(nexusAuth, {
  publicPaths: ['/', '/login', '/signup', '/reset-password'],
  loginPath: '/login',
});

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};
