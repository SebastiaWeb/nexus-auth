# @nexusauth/express-helpers

Express middleware for NexusAuth - Optimized and flexible authentication middleware.

## Features

- ✅ **Optimized Middleware**: Fast session validation
- ✅ **Flexible**: Required or optional authentication
- ✅ **Custom Handlers**: Error and unauthorized handlers
- ✅ **Helper Functions**: Extract user, session, sign out
- ✅ **TypeScript Ready**: Full type definitions with Request extensions
- ✅ **Lightweight**: Minimal dependencies

## Installation

```bash
npm install @nexusauth/core @nexusauth/express-helpers express cookie-parser
```

## Requirements

- `@nexusauth/core`: workspace:*
- `express`: ^4.0.0 || ^5.0.0
- `cookie-parser`: For reading session cookies

## Quick Start

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { auth } from './auth';
import { createAuthMiddleware } from '@nexusauth/express-helpers';

const app = express();

// Required: cookie-parser middleware
app.use(cookieParser());

// Protect all routes
app.use(createAuthMiddleware(auth));

app.get('/protected', (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

## Usage

### Basic Authentication Middleware

Protect all routes with required authentication:

```typescript
import { createAuthMiddleware } from '@nexusauth/express-helpers';

// All routes after this require authentication
app.use(createAuthMiddleware(auth));

app.get('/dashboard', (req, res) => {
  res.json({ user: req.user });
});
```

### Required Authentication

Protect specific routes:

```typescript
import { requireAuth } from '@nexusauth/express-helpers';

app.get('/profile', requireAuth(auth), (req, res) => {
  res.json({ user: req.user });
});
```

### Optional Authentication

Attach user if present but don't block unauthenticated requests:

```typescript
import { optionalAuth } from '@nexusauth/express-helpers';

app.get('/home', optionalAuth(auth), (req, res) => {
  if (req.user) {
    res.json({ message: `Welcome back, ${req.user.name}` });
  } else {
    res.json({ message: 'Welcome, guest' });
  }
});
```

### Helper Functions

Extract user and session from request:

```typescript
import { requireAuth, getCurrentUser, getCurrentSession } from '@nexusauth/express-helpers';

app.get('/me', requireAuth(auth), (req, res) => {
  const user = getCurrentUser(req);
  const session = getCurrentSession(req);

  res.json({
    user,
    sessionExpires: session.expires,
  });
});
```

### Sign Out

Handle user sign out:

```typescript
import { requireAuth, signOut } from '@nexusauth/express-helpers';

app.post('/logout', requireAuth(auth), async (req, res) => {
  await signOut(auth, req, res);
  res.json({ message: 'Logged out successfully' });
});
```

## Advanced Usage

### Custom Error Handlers

```typescript
import { createAuthMiddleware } from '@nexusauth/express-helpers';

app.use(
  createAuthMiddleware(auth, {
    onUnauthorized: (req, res, next) => {
      res.status(401).json({
        error: 'Please log in',
        redirectUrl: '/login',
      });
    },
    onError: (error, req, res, next) => {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    },
  })
);
```

### Conditional Authentication

Mix protected and public routes:

```typescript
import { requireAuth, optionalAuth } from '@nexusauth/express-helpers';

// Public route
app.get('/public', (req, res) => {
  res.json({ message: 'Public content' });
});

// Optional auth route
app.get('/feed', optionalAuth(auth), (req, res) => {
  const user = req.user;
  const feed = user ? getPersonalizedFeed(user.id) : getPublicFeed();
  res.json({ feed });
});

// Protected route
app.get('/dashboard', requireAuth(auth), (req, res) => {
  res.json({ user: req.user });
});
```

## Complete Example

### Setup

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

### Express Server

```typescript
// server.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import { auth } from './auth';
import {
  requireAuth,
  optionalAuth,
  getCurrentUser,
  signOut,
} from '@nexusauth/express-helpers';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Public routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/login', (req, res) => {
  res.json({ message: 'Login page' });
});

// Optional auth routes
app.get('/feed', optionalAuth(auth), (req, res) => {
  const user = getCurrentUser(req);

  if (user) {
    res.json({ message: `Personalized feed for ${user.name}` });
  } else {
    res.json({ message: 'Public feed' });
  }
});

// Protected routes
app.get('/profile', requireAuth(auth), (req, res) => {
  const user = getCurrentUser(req);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

app.patch('/profile', requireAuth(auth), async (req, res) => {
  const user = getCurrentUser(req);

  const updatedUser = await auth.adapter.updateUser({
    id: user.id,
    ...req.body,
  });

  res.json({ user: updatedUser });
});

app.post('/logout', requireAuth(auth), async (req, res) => {
  await signOut(auth, req, res);
  res.json({ message: 'Logged out successfully' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Protected API Routes

```typescript
// routes/users.ts
import { Router } from 'express';
import { requireAuth, getCurrentUser } from '@nexusauth/express-helpers';
import { auth } from '../auth';

const router = Router();

// All routes in this router require authentication
router.use(requireAuth(auth));

router.get('/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user });
});

router.get('/settings', (req, res) => {
  const user = getCurrentUser(req);
  res.json({
    userId: user.id,
    settings: { /* ... */ },
  });
});

router.delete('/account', async (req, res) => {
  const user = getCurrentUser(req);

  await auth.adapter.deleteUserSessions(user.id);
  await auth.adapter.deleteUser(user.id);

  res.json({ message: 'Account deleted' });
});

export default router;
```

## API Reference

### Middleware

#### `createAuthMiddleware(auth, options?)`

Creates authentication middleware with custom options.

**Parameters:**
- `auth`: NexusAuth instance (required)
- `options`: AuthMiddlewareOptions (optional)
  - `required`: Boolean (default: `true`) - Whether authentication is required
  - `onUnauthorized`: Custom unauthorized handler
  - `onError`: Custom error handler

**Returns:** Express middleware function

#### `requireAuth(auth, options?)`

Creates middleware that requires authentication.

**Parameters:**
- `auth`: NexusAuth instance (required)
- `options`: Omit<AuthMiddlewareOptions, 'required'> (optional)

**Returns:** Express middleware function

#### `optionalAuth(auth)`

Creates middleware that attaches user if present but doesn't block unauthenticated requests.

**Parameters:**
- `auth`: NexusAuth instance (required)

**Returns:** Express middleware function

### Helper Functions

#### `getCurrentUser(req)`

Extract current user from request.

**Parameters:**
- `req`: Express Request

**Returns:** User object or null

#### `getCurrentSession(req)`

Extract current session from request.

**Parameters:**
- `req`: Express Request

**Returns:** Session object or null

#### `signOut(auth, req, res)`

Sign out user (delete session and clear cookie).

**Parameters:**
- `auth`: NexusAuth instance
- `req`: Express Request
- `res`: Express Response

**Returns:** Promise<void>

## TypeScript Support

Request type is automatically extended to include `user` and `session`:

```typescript
import type { Request } from 'express';

app.get('/profile', requireAuth(auth), (req: Request, res) => {
  // TypeScript knows about req.user and req.session
  const userId = req.user.id;
  const expires = req.session.expires;
});
```

## peerDependencies

```json
{
  "peerDependencies": {
    "@nexusauth/core": "workspace:*",
    "express": "^4.0.0 || ^5.0.0"
  }
}
```

**Note:** You also need `cookie-parser` middleware to read session cookies.

## License

MIT
