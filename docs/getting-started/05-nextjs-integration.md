# Integración con Next.js

Guía completa para usar NexusAuth en Next.js 13, 14 y 15 (App Router y Pages Router).

---

## Instalación

```bash
npm install @nexusauth/core @nexusauth/nextjs-helpers
npm install @nexusauth/prisma-adapter @prisma/client
npm install bcrypt jsonwebtoken
```

---

## Setup Básico

### 1. Configurar Prisma

```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  password      String?
  image         String?
  createdAt     DateTime  @default(now())

  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### 2. Crear Configuración de NexusAuth

```typescript
// lib/auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const nexusAuth = NexusAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
```

---

## App Router (Next.js 13+)

### 1. API Routes

```typescript
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    const user = await nexusAuth.createUser({
      email,
      password,
      name,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

```typescript
// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const result = await nexusAuth.signIn('credentials', {
      email,
      password,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

```typescript
// app/api/auth/callback/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code' },
        { status: 400 }
      );
    }

    const result = await nexusAuth.signIn('google', { code });

    // Redirigir al dashboard con token
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.redirect(new URL(`/login?error=${error.message}`, request.url));
  }
}
```

### 2. Server Components con Helpers

```typescript
// app/dashboard/page.tsx
import { getSession, requireAuth } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Opción 1: Redireccionar si no está autenticado
  const session = await getSession(nexusAuth);

  if (!session) {
    redirect('/login');
  }

  // Opción 2: Usar requireAuth (lanza error si no autenticado)
  // const session = await requireAuth(nexusAuth);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {session.user.name}!</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

```typescript
// app/profile/page.tsx
import { getCurrentUser } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

export default async function ProfilePage() {
  const user = await getCurrentUser(nexusAuth);

  if (!user) {
    return <div>No autenticado</div>;
  }

  return (
    <div>
      <h1>Perfil</h1>
      <p>ID: {user.id}</p>
      <p>Nombre: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### 3. Client Components

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();

      // Guardar token en localStorage o cookie
      localStorage.setItem('accessToken', data.accessToken);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Iniciar Sesión</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Iniciar Sesión</button>

      <hr />

      <button type="button" onClick={handleGoogleLogin}>
        Continuar con Google
      </button>
    </form>
  );
}
```

### 4. Middleware para Proteger Rutas

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

const authMiddleware = createAuthMiddleware(nexusAuth, {
  publicPaths: ['/login', '/signup', '/'],
  loginPath: '/login',
});

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/api/protected/:path*'],
};
```

---

## Pages Router (Next.js 12+)

### 1. API Routes

```typescript
// pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { nexusAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    const user = await nexusAuth.createUser({
      email,
      password,
      name,
    });

    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
```

### 2. Server-Side Rendering

```typescript
// pages/dashboard.tsx
import { GetServerSideProps } from 'next';
import { getSessionFromReq } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = await getSessionFromReq(nexusAuth, req);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: session.user,
    },
  };
};

export default function Dashboard({ user }: { user: any }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user.name}!</p>
    </div>
  );
}
```

### 3. HOC para Proteger Páginas

```typescript
// pages/profile.tsx
import { withAuth } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

function ProfilePage({ user }: { user: any }) {
  return (
    <div>
      <h1>Perfil</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}

export default withAuth(ProfilePage, nexusAuth);
```

---

## Logout

```typescript
// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Eliminar cookie de sesión
  response.cookies.delete('accessToken');

  return response;
}
```

Client-side:

```typescript
import { signOut } from '@nexusauth/nextjs-helpers';

const handleLogout = async () => {
  await signOut('/api/auth/signout');
  router.push('/login');
};
```

---

## Variables de Entorno

```env
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nexusauth"

# JWT
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"

# OAuth
GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xyz123..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Próximos Pasos

- 👉 [Best Practices](../best-practices/security.md)
- 👉 [Ejemplo Completo Next.js + Prisma](../examples/nextjs-prisma/)
