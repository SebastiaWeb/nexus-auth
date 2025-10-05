import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(32).toString('hex');

  const authUrl = nexusAuth.getAuthorizationUrl('google', { state });

  const response = NextResponse.redirect(authUrl);

  // Guardar state en cookie para validar en callback
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutos
  });

  return response;
}
