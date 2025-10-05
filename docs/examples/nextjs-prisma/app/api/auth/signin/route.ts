import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';
import { z } from 'zod';

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = signinSchema.parse(body);

    const result = await nexusAuth.signIn(data);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validación fallida', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
