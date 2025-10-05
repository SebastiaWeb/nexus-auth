import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Eliminar cookie de sesión
  response.cookies.delete('accessToken');

  return response;
}
