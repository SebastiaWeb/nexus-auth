# Ejemplo: Next.js + Prisma + PostgreSQL

Ejemplo completo de aplicación Next.js con autenticación usando NexusAuth.

---

## Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: NexusAuth
- **Styling**: Tailwind CSS
- **Language**: TypeScript

---

## Características

- ✅ Next.js 15 App Router
- ✅ Server Components y Client Components
- ✅ API Routes con Route Handlers
- ✅ Registro e inicio de sesión con credentials
- ✅ OAuth con Google
- ✅ Protected pages con middleware
- ✅ Server-side authentication
- ✅ Client-side authentication hooks
- ✅ Password reset flow
- ✅ Responsive UI con Tailwind CSS

---

## Estructura del Proyecto

```
nextjs-prisma/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   └── profile/
│   ├── api/
│   │   └── auth/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   ├── ui/
│   └── providers/
├── lib/
│   ├── auth.ts
│   └── prisma.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Instalación

### 1. Instalar dependencias

```bash
cd examples/nextjs-prisma
npm install
```

### 2. Configurar PostgreSQL

```bash
createdb nexusauth_nextjs
```

### 3. Variables de entorno

Copiar `.env.example` a `.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/nexusauth_nextjs"

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar migraciones de Prisma

```bash
npx prisma generate
npx prisma db push
```

### 5. Iniciar servidor

```bash
npm run dev
```

Aplicación corriendo en `http://localhost:3000`

---

## Rutas

### Públicas
- `/` - Landing page
- `/login` - Iniciar sesión
- `/signup` - Registrarse
- `/reset-password` - Resetear contraseña

### Protegidas (requieren autenticación)
- `/dashboard` - Dashboard del usuario
- `/profile` - Perfil del usuario

### API Routes
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/auth/google` - Iniciar OAuth
- `GET /api/auth/callback/google` - Callback OAuth
- `POST /api/auth/refresh`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

---

## Uso

### Server Components (Recomendado)

```typescript
// app/dashboard/page.tsx
import { getSession } from '@nexus-auth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession(nexusAuth);

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {session.user.name}!</p>
    </div>
  );
}
```

### Client Components

```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { session, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!session) return <div>No autenticado</div>;

  return <div>Hola {session.user.name}</div>;
}
```

### Middleware Protection

```typescript
// middleware.ts
import { createAuthMiddleware } from '@nexus-auth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

export default createAuthMiddleware(nexusAuth, {
  publicPaths: ['/', '/login', '/signup'],
  loginPath: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};
```

---

## Características Destacadas

### 1. Autenticación en Server Components

```typescript
import { requireAuth } from '@nexus-auth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

export default async function ProtectedPage() {
  // Lanza error automático si no está autenticado
  const session = await requireAuth(nexusAuth);

  return <div>Usuario: {session.user.email}</div>;
}
```

### 2. Hook Personalizado para Cliente

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { session, loading };
}
```

### 3. Formularios con Server Actions (Opcional)

```typescript
// app/(auth)/login/actions.ts
'use server';

import { nexusAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const result = await nexusAuth.signIn('credentials', { email, password });

    cookies().set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
    });

    redirect('/dashboard');
  } catch (error: any) {
    return { error: error.message };
  }
}
```

---

## Tailwind CSS

UI moderna y responsive incluida con componentes de autenticación estilizados.

---

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## Deploy

### Vercel (Recomendado)

```bash
vercel deploy
```

Variables de entorno a configurar en Vercel:
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NexusAuth Docs](../../DOCUMENTATION.md)
