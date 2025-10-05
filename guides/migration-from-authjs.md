# Migration Guide: Auth.js (NextAuth) to NexusAuth

This guide will help you migrate from Auth.js (formerly NextAuth.js) to NexusAuth.

## Why Migrate to NexusAuth?

- **Schema Mapping**: Customize table/field names to match your existing database (unique feature!)
- **Framework Agnostic**: Works with Next.js, Express, NestJS, and more
- **Lightweight**: Uses peerDependencies for smaller bundle size
- **Modern Architecture**: Hexagonal architecture for better extensibility
- **TypeScript First**: Complete type safety out of the box

## Key Differences

| Feature | Auth.js | NexusAuth |
|---------|---------|-----------|
| Schema Mapping | ❌ No | ✅ Yes (unique!) |
| Framework Support | Next.js focused | Framework agnostic |
| Dependencies | Bundled | peerDependencies |
| Adapters | 28+ | 4 (strategic, high quality) |
| OAuth Providers | 80+ | 4 (growing) |
| Architecture | Monolithic | Hexagonal |

---

## Step-by-Step Migration

### Step 1: Install NexusAuth

**Remove Auth.js:**
```bash
npm uninstall next-auth
```

**Install NexusAuth:**
```bash
npm install @nexusauth/core @nexusauth/nextjs-helpers
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt

# Install adapter (choose based on your database)
npm install @nexusauth/prisma-adapter @prisma/client
# OR
npm install @nexusauth/typeorm-adapter typeorm
```

---

### Step 2: Update Prisma Schema

**Auth.js Schema:**
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
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
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

**NexusAuth Schema (similar, with optional additions):**
```prisma
model User {
  id                      String    @id @default(cuid())
  email                   String    @unique
  emailVerified           DateTime?
  name                    String?
  image                   String?
  password                String?   // For credentials auth
  resetToken              String?
  resetTokenExpiry        DateTime?
  verificationToken       String?
  verificationTokenExpiry DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  accounts Account[]
  sessions Session[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id                  String   @id @default(cuid())
  sessionToken        String   @unique
  userId              String
  expires             DateTime
  refreshToken        String?
  refreshTokenExpires DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

**Key Changes:**
- Added password fields for credentials auth
- Added reset/verification tokens
- Added optional refresh tokens
- Table names can be mapped (see Schema Mapping below)

---

### Step 3: Migrate Configuration

**Auth.js Configuration (`[...nextauth].ts`):**
```typescript
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      session.user.id = user.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
```

**NexusAuth Configuration (`lib/auth.ts`):**
```typescript
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adapter = new PrismaAdapter({ client: prisma }, {
  // Optional: Map to existing schema
  mapping: {
    user: {
      table: 'users',
      fields: {
        id: 'id',
        email: 'email',
        emailVerified: 'emailVerified',
        name: 'name',
        image: 'image',
      },
    },
  },
});

export const auth = new NexusAuth({
  adapter,
  secret: process.env.JWT_SECRET!,
  session: {
    strategy: 'jwt',
    updateAge: 86400,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.userId;
      return session;
    },
  },
});

export const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
});
```

---

### Step 4: Update API Routes

**Auth.js (Automatic routes):**
```
/api/auth/[...nextauth].ts
```

**NexusAuth (Manual routes - more control):**

Create `app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const result = await auth.signIn({ email, password });

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
```

Create `app/api/auth/google/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { auth, googleProvider } from '@/lib/auth';

export async function GET() {
  const { url } = await auth.getAuthorizationUrl(googleProvider.id);
  return NextResponse.redirect(url);
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
    const result = await auth.handleOAuthCallback(
      googleProvider.id,
      code
    );

    const response = NextResponse.redirect('/dashboard');
    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.redirect(`/login?error=${error.message}`);
  }
}
```

---

### Step 5: Update Client Code

**Auth.js (useSession hook):**
```typescript
import { useSession } from 'next-auth/react';

function Profile() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading...</p>;
  if (!session) return <p>Not authenticated</p>;

  return <p>Hello {session.user.email}</p>;
}
```

**NexusAuth (Custom hook or direct fetch):**
```typescript
'use client';
import { useState, useEffect } from 'react';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Not authenticated</p>;

  return <p>Hello {user.email}</p>;
}
```

**Or create a custom hook:**
```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setUser(data.user);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  return { user, loading };
}
```

---

### Step 6: Update Middleware

**Auth.js Middleware:**
```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

**NexusAuth Middleware:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@nexusauth/nextjs-helpers';
import { auth } from '@/lib/auth';

const authMiddleware = createAuthMiddleware(auth, {
  publicRoutes: ['/login', '/register', '/'],
  redirectTo: '/login',
});

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

### Step 7: Update Server Components

**Auth.js:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <div>Hello {session.user.email}</div>;
}
```

**NexusAuth:**
```typescript
import { getCurrentUser } from '@nexusauth/nextjs-helpers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getCurrentUser(auth);

  if (!user) {
    redirect('/login');
  }

  return <div>Hello {user.email}</div>;
}
```

---

## Schema Mapping (Unique to NexusAuth!)

If you have an existing database with custom table/column names, use schema mapping:

```typescript
const adapter = new PrismaAdapter({ client: prisma }, {
  mapping: {
    user: {
      table: 'custom_users',           // Map to existing table
      fields: {
        id: 'user_id',                 // Map field names
        email: 'email_address',
        emailVerified: 'email_verified_at',
        name: 'full_name',
        image: 'avatar_url',
      },
    },
    account: {
      table: 'oauth_accounts',
      fields: {
        userId: 'user_id',
        provider: 'oauth_provider',
        // ... other mappings
      },
    },
  },
});
```

**This is impossible with Auth.js!** You'd need to modify your database schema to match Auth.js's requirements.

---

## Environment Variables

**Auth.js:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

**NexusAuth:**
```env
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

## Feature Comparison

### Supported in Both
- ✅ OAuth authentication
- ✅ Email/password authentication
- ✅ Session management
- ✅ Callbacks
- ✅ TypeScript support

### NexusAuth Advantages
- ✅ **Schema mapping** (unique!)
- ✅ Framework agnostic (not just Next.js)
- ✅ Smaller bundle size (peerDependencies)
- ✅ Built-in password reset flow
- ✅ Built-in email verification
- ✅ Refresh token support
- ✅ Hexagonal architecture

### Auth.js Advantages
- ✅ More OAuth providers (80+ vs 4)
- ✅ More database adapters (28 vs 4)
- ✅ Automatic API routes
- ✅ Built-in UI components

---

## Migration Checklist

- [ ] Install NexusAuth packages
- [ ] Update Prisma schema (add password/token fields)
- [ ] Run Prisma migration
- [ ] Create NexusAuth configuration
- [ ] Migrate API routes
- [ ] Update client components
- [ ] Update server components
- [ ] Update middleware
- [ ] Test authentication flows
- [ ] Test OAuth providers
- [ ] Remove Auth.js dependencies

---

## Troubleshooting

### "Cannot find user after OAuth login"
Make sure you're creating sessions properly and using the correct token storage.

### "JWT verification fails"
Verify your `JWT_SECRET` is correctly set and matches across all environments.

### "Schema mismatch errors"
Use schema mapping to match your existing database structure.

---

## Next Steps

- [NexusAuth API Reference](./api-reference.md)
- [Schema Mapping Guide](./schema-mapping.md)
- [OAuth Providers](./oauth-providers.md)
- [Next.js Integration](./getting-started-nextjs.md)

---

## Need Help?

- [GitHub Issues](https://github.com/yourusername/nexus-auth/issues)
- [Discussions](https://github.com/yourusername/nexus-auth/discussions)
- [Documentation](../DOCUMENTATION.md)
