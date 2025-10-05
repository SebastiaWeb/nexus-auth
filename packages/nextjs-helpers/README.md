# @nexusauth/nextjs-helpers

Next.js helpers for NexusAuth - Support for both App Router and Pages Router.

## Features

- ✅ **App Router Support**: Server Components, Server Actions, Route Handlers
- ✅ **Pages Router Support**: getServerSideProps, API Routes
- ✅ **Middleware Support**: Route protection with Next.js middleware
- ✅ **TypeScript Ready**: Full type definitions included
- ✅ **Zero Config**: Works out of the box
- ✅ **Lightweight**: Minimal dependencies

## Installation

```bash
npm install @nexusauth/core @nexusauth/nextjs-helpers next
```

## Requirements

- `@nexusauth/core`: workspace:*
- `next`: ^13.0.0 || ^14.0.0 || ^15.0.0

## App Router Usage

### Server Components

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { getSession, getCurrentUser } from '@nexusauth/nextjs-helpers';

export default async function DashboardPage() {
  // Get full session
  const session = await getSession(auth);
  if (!session) return redirect('/login');

  // Or just get the user
  const user = await getCurrentUser(auth);

  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Protected Pages

```typescript
// app/admin/page.tsx
import { auth } from '@/auth';
import { requireAuth } from '@nexusauth/nextjs-helpers';

export default async function AdminPage() {
  // Throws error if not authenticated
  const user = await requireAuth(auth);

  return <div>Admin: {user.email}</div>;
}
```

### Server Actions

```typescript
// app/actions.ts
'use server';

import { auth } from '@/auth';
import { getCurrentUser, signOut } from '@nexusauth/nextjs-helpers';

export async function updateProfile(data: FormData) {
  const user = await getCurrentUser(auth);
  if (!user) throw new Error('Unauthorized');

  // Update profile logic
}

export async function handleSignOut() {
  await signOut(auth);
  redirect('/');
}
```

### Route Handlers

```typescript
// app/api/user/route.ts
import { auth } from '@/auth';
import { getCurrentUser } from '@nexusauth/nextjs-helpers';

export async function GET() {
  const user = await getCurrentUser(auth);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ user });
}
```

## Pages Router Usage

### getServerSideProps

```typescript
// pages/profile.tsx
import { auth } from '@/auth';
import { getSessionFromReq, getCurrentUserFromReq } from '@nexusauth/nextjs-helpers';

export const getServerSideProps = async (ctx) => {
  // Get session
  const session = await getSessionFromReq(auth, ctx.req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // Or just get user
  const user = await getCurrentUserFromReq(auth, ctx.req);

  return { props: { user } };
};

export default function ProfilePage({ user }) {
  return <div>Profile: {user.email}</div>;
}
```

### Protected getServerSideProps (HOC)

```typescript
// pages/dashboard.tsx
import { auth } from '@/auth';
import { withAuthSSR } from '@nexusauth/nextjs-helpers';

export const getServerSideProps = withAuthSSR(auth, async (ctx, user) => {
  // User is guaranteed to exist
  return {
    props: { user },
  };
});

export default function DashboardPage({ user }) {
  return <div>Dashboard: {user.name}</div>;
}
```

### API Routes

```typescript
// pages/api/protected.ts
import { auth } from '@/auth';
import { withAuth } from '@nexusauth/nextjs-helpers';

export default withAuth(auth, async (req, res, user) => {
  // User is guaranteed to exist
  res.json({ message: `Hello ${user.name}` });
});
```

### Sign Out API Route

```typescript
// pages/api/auth/signout.ts
import { auth } from '@/auth';
import { handleSignOut } from '@nexusauth/nextjs-helpers';

export default async function handler(req, res) {
  await handleSignOut(auth, req, res);
  res.redirect('/');
}
```

## Middleware Usage

### Basic Protection

```typescript
// middleware.ts
import { auth } from '@/auth';
import { createAuthMiddleware } from '@nexusauth/nextjs-helpers';

export const middleware = createAuthMiddleware(auth, {
  publicRoutes: ['/', '/login', '/register'],
  protectedRoutes: ['/dashboard', '/profile', '/admin'],
  loginUrl: '/login',
  defaultAuthRedirect: '/dashboard',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Custom Middleware Logic

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getSessionFromMiddleware } from '@nexusauth/nextjs-helpers';

export async function middleware(request: NextRequest) {
  const session = await getSessionFromMiddleware(auth, request);

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect authenticated users from login page
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Complete Example

### Setup Authentication

```typescript
// auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = new NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET!,
});
```

### App Router - Protected Page

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { requireAuth } from '@nexusauth/nextjs-helpers';

export default async function DashboardPage() {
  const user = await requireAuth(auth);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome back, {user.name}</p>
    </div>
  );
}
```

### App Router - Server Action

```typescript
// app/profile/actions.ts
'use server';

import { auth } from '@/auth';
import { getCurrentUser } from '@nexusauth/nextjs-helpers';
import { revalidatePath } from 'next/cache';

export async function updateName(formData: FormData) {
  const user = await getCurrentUser(auth);
  if (!user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;

  await auth.adapter.updateUser({
    id: user.id,
    name,
  });

  revalidatePath('/profile');
}
```

### Pages Router - Protected Page

```typescript
// pages/settings.tsx
import { auth } from '@/auth';
import { withAuthSSR } from '@nexusauth/nextjs-helpers';

export const getServerSideProps = withAuthSSR(auth, async (ctx, user) => {
  return {
    props: {
      user,
    },
  };
});

export default function SettingsPage({ user }) {
  return (
    <div>
      <h1>Settings</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Pages Router - API Route

```typescript
// pages/api/me.ts
import { auth } from '@/auth';
import { withAuth } from '@nexusauth/nextjs-helpers';

export default withAuth(auth, async (req, res, user) => {
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});
```

## API Reference

### App Router

#### `getSession(nexusAuth)`

Returns the current session and user from cookies.

```typescript
const session = await getSession(auth);
// Returns: { session, user } | null
```

#### `getCurrentUser(nexusAuth)`

Returns just the current user.

```typescript
const user = await getCurrentUser(auth);
// Returns: User | null
```

#### `requireAuth(nexusAuth)`

Gets current user or throws an error.

```typescript
const user = await requireAuth(auth);
// Returns: User | throws Error
```

#### `signOut(nexusAuth)`

Signs out the current user (deletes session).

```typescript
await signOut(auth);
```

### Pages Router

#### `getSessionFromReq(nexusAuth, req)`

Gets session from request object.

```typescript
const session = await getSessionFromReq(auth, ctx.req);
```

#### `getCurrentUserFromReq(nexusAuth, req)`

Gets user from request object.

```typescript
const user = await getCurrentUserFromReq(auth, ctx.req);
```

#### `withAuth(nexusAuth, handler)`

HOC for protecting API routes.

```typescript
export default withAuth(auth, async (req, res, user) => {
  // Handler code
});
```

#### `withAuthSSR(nexusAuth, handler)`

HOC for protecting getServerSideProps.

```typescript
export const getServerSideProps = withAuthSSR(auth, async (ctx, user) => {
  return { props: { user } };
});
```

#### `handleSignOut(nexusAuth, req, res)`

Handles sign out in API routes.

```typescript
await handleSignOut(auth, req, res);
```

### Middleware

#### `createAuthMiddleware(nexusAuth, config)`

Creates a Next.js middleware for route protection.

**Config:**
- `publicRoutes`: Array of public route paths
- `protectedRoutes`: Array of protected route paths
- `loginUrl`: Redirect URL for unauthenticated users (default: '/login')
- `defaultAuthRedirect`: Redirect URL for authenticated users (default: '/dashboard')

```typescript
export const middleware = createAuthMiddleware(auth, {
  publicRoutes: ['/', '/login'],
  protectedRoutes: ['/dashboard'],
});
```

#### `getSessionFromMiddleware(nexusAuth, request)`

Gets session from Next.js middleware request.

```typescript
const session = await getSessionFromMiddleware(auth, request);
```

## TypeScript Support

All functions are fully typed. Import types from `@nexusauth/core`:

```typescript
import type { User, Session } from '@nexusauth/core';
```

## peerDependencies

```json
{
  "peerDependencies": {
    "@nexusauth/core": "workspace:*",
    "next": "^13.0.0 || ^14.0.0 || ^15.0.0"
  }
}
```

## License

MIT
