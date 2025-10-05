# Migrar de Auth.js (NextAuth) a NexusAuth

Guía paso a paso para migrar tu proyecto de Auth.js/NextAuth a NexusAuth.

---

## ¿Por qué migrar a NexusAuth?

### Ventajas de NexusAuth sobre Auth.js

| Característica | Auth.js | NexusAuth |
|----------------|---------|-----------|
| **Schema Mapping** | ❌ Debes usar su schema | ✅ Se adapta a tu DB |
| **Framework Agnostic** | ❌ Principalmente Next.js | ✅ Cualquier framework |
| **peerDependencies** | ❌ Bundle más grande | ✅ Paquetes ligeros |
| **TypeScript** | ⚠️ Parcial | ✅ 100% TypeScript |
| **Arquitectura** | Monolítica | ✅ Hexagonal (modular) |

**Principal razón**: Si tienes una DB existente con schema custom, NexusAuth te permite conservarla sin migración.

---

## Paso 1: Comparación de Configuración

### Auth.js (antes)

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
});
```

### NexusAuth (después)

```typescript
// lib/auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const nexusAuth = NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.JWT_SECRET!,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});
```

**Cambios principales**:
- ✅ Configuración más explícita
- ✅ `redirectUri` requerido para OAuth
- ✅ JWT secret explícito (no auto-generado)
- ✅ Callbacks con tipos más claros

---

## Paso 2: Migrar Prisma Schema

### Auth.js Schema (antes)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?
  access_token       String?
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### NexusAuth Schema (recomendado)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  password      String?   // ⬅️ Nuevo: para credentials auth
  image         String?
  createdAt     DateTime  @default(now()) // ⬅️ Nuevo

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

**Cambios**:
- ✅ Añadido `password` para credentials auth
- ✅ Añadido `createdAt`
- ✅ Añadida tabla `VerificationToken` para email verification
- ✅ Cambiado `cuid()` a `uuid()` (opcional, pero recomendado)

**Ejecutar migración**:
```bash
npx prisma migrate dev --name add_nexusauth_fields
```

---

## Paso 3: Migrar API Routes

### Auth.js (antes)

```typescript
// pages/api/auth/[...nextauth].ts
// Todo en un solo archivo catch-all
```

### NexusAuth (después)

Crear rutas separadas:

```typescript
// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const result = await nexusAuth.signIn({
      email: body.email,
      password: body.password,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
```

```typescript
// app/api/auth/callback/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nexusAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  try {
    const result = await nexusAuth.signIn('google', { code: code! });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## Paso 4: Migrar useSession()

### Auth.js (antes)

```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Cargando...</div>;
  if (status === 'unauthenticated') return <div>No autenticado</div>;

  return <div>Hola {session?.user?.name}</div>;
}
```

### NexusAuth (después)

```typescript
'use client';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (!user) return <div>No autenticado</div>;

  return <div>Hola {user.name}</div>;
}
```

**O crear un hook personalizado**:

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { session, loading };
}
```

Uso:

```typescript
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { session, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!session) return <div>No autenticado</div>;

  return <div>Hola {session.user.name}</div>;
}
```

---

## Paso 5: Migrar Server Components

### Auth.js (antes)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <div>Bienvenido {session.user.name}</div>;
}
```

### NexusAuth (después)

```typescript
import { getSession } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession(nexusAuth);

  if (!session) {
    redirect('/login');
  }

  return <div>Bienvenido {session.user.name}</div>;
}
```

**O usar `requireAuth`**:

```typescript
import { requireAuth } from '@nexusauth/nextjs-helpers';
import { nexusAuth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await requireAuth(nexusAuth); // Lanza error si no autenticado

  return <div>Bienvenido {session.user.name}</div>;
}
```

---

## Paso 6: Migrar Providers

### Auth.js (antes)

```typescript
// app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### NexusAuth (después)

**No necesitas Provider** - NexusAuth no usa React Context.

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

---

## Paso 7: Migrar signIn() y signOut()

### Auth.js (antes)

```typescript
'use client';
import { signIn, signOut } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div>
      <button onClick={() => signIn('google')}>
        Sign in with Google
      </button>
      <button onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
```

### NexusAuth (después)

```typescript
'use client';
import { signOut } from '@nexusauth/nextjs-helpers';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    await signOut('/api/auth/signout');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
      <button onClick={handleLogout}>
        Sign out
      </button>
    </div>
  );
}
```

---

## Paso 8: Actualizar Variables de Entorno

### Auth.js (antes)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### NexusAuth (después)

```env
# Eliminar
# NEXTAUTH_URL
# NEXTAUTH_SECRET

# Añadir
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mantener
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Checklist de Migración

- [ ] Instalar `@nexusauth/core`, `@nexusauth/nextjs-helpers`, `@nexusauth/prisma-adapter`
- [ ] Actualizar Prisma schema (añadir `password`, `createdAt`, `VerificationToken`)
- [ ] Ejecutar `npx prisma migrate dev`
- [ ] Crear `lib/auth.ts` con configuración de NexusAuth
- [ ] Migrar API routes (`/api/auth/[...nextauth]` → rutas separadas)
- [ ] Reemplazar `useSession()` con hook personalizado
- [ ] Reemplazar `getServerSession()` con `getSession()`
- [ ] Eliminar `<SessionProvider>`
- [ ] Actualizar variables de entorno
- [ ] Migrar llamadas a `signIn()` y `signOut()`
- [ ] Testear flujos de auth (login, logout, OAuth)

---

## Ventajas Después de Migrar

✅ **Menor bundle size** - peerDependencies
✅ **Mayor flexibilidad** - No atado a Next.js
✅ **Schema mapping** - Puedes adaptar tu DB
✅ **TypeScript completo** - Types más claros
✅ **Arquitectura modular** - Más fácil de extender

---

## ¿Necesitas Ayuda?

- 📖 [Documentación completa](../../DOCUMENTATION.md)
- 💬 [GitHub Discussions](https://github.com/your-repo/discussions)
- 🐛 [Reportar un problema](https://github.com/your-repo/issues)
