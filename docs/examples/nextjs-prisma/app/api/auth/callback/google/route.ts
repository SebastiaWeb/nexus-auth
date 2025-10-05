import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    // Validar state (CSRF protection)
    const savedState = request.cookies.get('oauth_state')?.value;
    if (state !== savedState) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }

    const result = await nexusAuth.signIn('google', { code });

    // Redirigir al dashboard con token en cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });

    // Limpiar oauth_state
    response.cookies.delete('oauth_state');

    return response;
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
