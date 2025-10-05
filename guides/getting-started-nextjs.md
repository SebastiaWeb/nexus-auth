# Getting Started with Next.js + NexusAuth

This guide will help you integrate NexusAuth into your Next.js application (App Router and Pages Router supported).

## Prerequisites

- Node.js 16+ installed
- Next.js 13+ project set up
- A database (PostgreSQL, MySQL, MongoDB, or SQLite)

## Installation

### 1. Install Core Packages

```bash
npm install @nexus-auth/core @nexus-auth/nextjs-helpers
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

### 2. Install Database Adapter

```bash
# For Prisma (recommended for Next.js)
npm install @nexus-auth/prisma-adapter @prisma/client
npx prisma init

# For TypeORM
npm install @nexus-auth/typeorm-adapter typeorm pg

# For MongoDB
npm install @nexus-auth/mongoose-adapter mongoose
```

### 3. Install OAuth Providers (Optional)

```bash
npm install @nexus-auth/providers
```

## Quick Start (App Router)

### Step 1: Configure Prisma Schema

Create your Prisma schema at `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  name          String?
  image         String?
  password      String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  accounts Account[]
  sessions Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refreshToken      String? @map("refresh_token")
  accessToken       String? @map("access_token")
  expiresAt         Int?    @map("expires_at")
  tokenType         String? @map("token_type")
  scope             String?
  idToken           String? @map("id_token")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  token        String   @unique
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  type      String
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("verification_tokens")
}
```

Run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 2: Create Auth Instance

Create `lib/auth.ts`:

```typescript
import { NexusAuth } from '@nexus-auth/core';
import { PrismaAdapter } from '@nexus-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adapter = new PrismaAdapter({
  prisma,
  // Optional: Custom field mapping
  mapping: {
    user: {
      fields: {
        id: 'id',
        email: 'email',
        emailVerified: 'emailVerified',
        name: 'name',
        image: 'image',
        password: 'password'
      }
    }
  }
});

export const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d'
  },
  session: {
    strategy: 'jwt',
    updateAge: 86400
  },
  callbacks: {
    session: async ({ session, user }) => {
      // Add custom fields to session
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id
        }
      };
    }
  }
});
```

### Step 3: Create API Routes

Create `app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    const result = await auth.register({
      email,
      password,
      name
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

Create `app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const result = await auth.login({
      email,
      password
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
```

Create `app/api/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@nexus-auth/nextjs-helpers';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession(auth, request);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: session.user,
    session
  });
}
```

### Step 4: Add Middleware (Optional)

Create `middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@nexus-auth/nextjs-helpers';
import { auth } from '@/lib/auth';

const authMiddleware = createAuthMiddleware(auth, {
  publicRoutes: ['/login', '/register', '/'],
  redirectTo: '/login'
});

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/protected/:path*'
  ]
};
```

### Step 5: Server Components

Use auth in Server Components:

```typescript
import { getCurrentUser } from '@nexus-auth/nextjs-helpers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser(auth);

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Step 6: Client Components

Create `app/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        // Store token in localStorage or cookie
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

## OAuth Integration

Add Google OAuth to `lib/auth.ts`:

```typescript
import { GoogleProvider } from '@nexus-auth/providers';

export const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
});
```

Create `app/api/auth/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth, googleProvider } from '@/lib/auth';

export async function GET() {
  const authUrl = await auth.getAuthorizationUrl(googleProvider);
  return NextResponse.redirect(authUrl);
}
```

Create `app/api/auth/callback/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth, googleProvider } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }

  try {
    const result = await auth.handleOAuthCallback(googleProvider, code);

    // Store token and redirect
    const response = NextResponse.redirect('/dashboard');
    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.redirect(`/login?error=${error.message}`);
  }
}
```

## Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# NextAuth URL
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Pages Router Support

NexusAuth also supports Next.js Pages Router. See [Pages Router Guide](./nextjs-pages-router.md).

## Next Steps

- [OAuth Providers Setup](./oauth-providers.md)
- [Custom Schema Mapping](./schema-mapping.md)
- [Session Management](./session-management.md)
- [TypeScript Types](./typescript.md)

## Full Example

Check out the complete Next.js + Prisma example in `/examples/nextjs-prisma`.

## Support

- [Documentation](../DOCUMENTATION.md)
- [API Reference](./api-reference.md)
- [GitHub Issues](https://github.com/yourusername/nexus-auth/issues)
