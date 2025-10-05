# NexusAuth API Reference

Complete API documentation for all NexusAuth packages.

## Table of Contents

- [Core API](#core-api)
  - [NexusAuth Class](#nexusauth-class)
  - [Configuration](#configuration)
  - [Types & Interfaces](#types--interfaces)
- [Database Adapters](#database-adapters)
- [OAuth Providers](#oauth-providers)
- [Framework Helpers](#framework-helpers)

---

## Core API

### NexusAuth Class

The main authentication class that handles all auth operations.

#### Constructor

```typescript
new NexusAuth(config: NexusAuthConfig)
```

**Parameters:**
- `config` - Configuration object (see [Configuration](#configuration))

**Throws:**
- Error if no adapter is provided
- Error if no JWT secret is provided

**Example:**
```typescript
import { NexusAuth } from '@nexusauth/core';
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';

const auth = new NexusAuth({
  adapter: new TypeORMAdapter({ dataSource }),
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d'
  }
});
```

---

### Authentication Methods

#### `register()`

Register a new user with email and password.

```typescript
async register(credentials: {
  email: string;
  password: string;
  name?: string;
}): Promise<{
  user: User;
  token: string;
  verificationToken: string;
}>
```

**Parameters:**
- `email` (required) - User's email address
- `password` (required) - Plain text password (will be hashed)
- `name` (optional) - User's display name

**Returns:**
- `user` - Created user object
- `token` - JWT access token
- `verificationToken` - Email verification token (send via email)

**Throws:**
- `"Email and password are required"` - Missing credentials
- `"User with this email already exists"` - Duplicate email

**Example:**
```typescript
const result = await auth.register({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe'
});

// Send verification email with result.verificationToken
console.log('User created:', result.user.id);
console.log('Access token:', result.token);
```

---

#### `signIn()` / `login()`

Authenticate user with email and password.

```typescript
async signIn(credentials: {
  email: string;
  password: string;
}): Promise<{
  user: User;
  token: string;
}>
```

**Parameters:**
- `email` (required) - User's email
- `password` (required) - Plain text password

**Returns:**
- `user` - Authenticated user object
- `token` - JWT access token

**Throws:**
- `"Email and password are required"` - Missing credentials
- `"Invalid email or password"` - Authentication failed

**Example:**
```typescript
const result = await auth.signIn({
  email: 'user@example.com',
  password: 'securePassword123'
});

console.log('Logged in as:', result.user.email);
```

---

#### `requestPasswordReset()`

Generate a password reset token for a user.

```typescript
async requestPasswordReset(email: string): Promise<{
  resetToken: string;
  user: User;
}>
```

**Parameters:**
- `email` (required) - User's email address

**Returns:**
- `resetToken` - Password reset token (send via email)
- `user` - User object

**Throws:**
- `"Email is required"` - Missing email
- `"If the email exists, a reset link will be sent"` - User not found (secure message)

**Example:**
```typescript
const result = await auth.requestPasswordReset('user@example.com');

// Send reset email with result.resetToken
const resetUrl = `https://yourapp.com/reset-password?token=${result.resetToken}`;
```

---

#### `verifyResetToken()`

Verify if a password reset token is valid.

```typescript
async verifyResetToken(resetToken: string): Promise<User>
```

**Parameters:**
- `resetToken` (required) - The reset token to verify

**Returns:**
- `User` - User object if token is valid

**Throws:**
- `"Reset token is required"` - Missing token
- `"Invalid or expired reset token"` - Token invalid or expired

---

#### `resetPassword()`

Reset user's password using a valid reset token.

```typescript
async resetPassword(
  resetToken: string,
  newPassword: string
): Promise<{
  user: User;
  token: string;
}>
```

**Parameters:**
- `resetToken` (required) - Valid reset token
- `newPassword` (required) - New password (will be hashed)

**Returns:**
- `user` - Updated user object
- `token` - New JWT token (auto-login)

**Throws:**
- `"Reset token and new password are required"` - Missing parameters
- `"Invalid or expired reset token"` - Token invalid
- `"No credentials account found for this user"` - User has no password account

**Example:**
```typescript
const result = await auth.resetPassword(
  resetToken,
  'newSecurePassword123'
);

console.log('Password reset successful');
console.log('Auto-login token:', result.token);
```

---

#### `sendVerificationEmail()`

Generate a new email verification token.

```typescript
async sendVerificationEmail(email: string): Promise<{
  verificationToken: string;
  user: User;
}>
```

**Parameters:**
- `email` (required) - User's email address

**Returns:**
- `verificationToken` - Verification token (send via email)
- `user` - User object

**Throws:**
- `"Email is required"` - Missing email
- `"User not found"` - No user with this email
- `"Email is already verified"` - Email already verified

---

#### `verifyEmail()`

Verify user's email using verification token.

```typescript
async verifyEmail(verificationToken: string): Promise<User>
```

**Parameters:**
- `verificationToken` (required) - Email verification token

**Returns:**
- `User` - Updated user with emailVerified set

**Throws:**
- `"Verification token is required"` - Missing token
- `"Invalid or expired verification token"` - Token invalid or expired

**Example:**
```typescript
const user = await auth.verifyEmail(verificationToken);

console.log('Email verified:', user.emailVerified);
```

---

### Session Management

#### `getSession()`

Get session from JWT token.

```typescript
async getSession(token: string): Promise<{
  user: User;
  expires: Date;
} | null>
```

**Parameters:**
- `token` (required) - JWT access token

**Returns:**
- Session object with user and expiry, or `null` if invalid

**Example:**
```typescript
const session = await auth.getSession(jwtToken);

if (session) {
  console.log('User:', session.user.email);
  console.log('Expires:', session.expires);
}
```

---

#### `refreshAccessToken()`

Refresh access token using refresh token.

```typescript
async refreshAccessToken(refreshToken: string): Promise<{
  token: string;
  refreshToken?: string;
}>
```

**Parameters:**
- `refreshToken` (required) - Valid refresh token

**Returns:**
- `token` - New access token
- `refreshToken` (optional) - New refresh token (if rotation enabled)

**Throws:**
- `"Refresh token is required"` - Missing token
- `"Refresh tokens are not enabled"` - Feature disabled in config
- `"Invalid or expired refresh token"` - Token invalid

**Example:**
```typescript
const result = await auth.refreshAccessToken(oldRefreshToken);

console.log('New access token:', result.token);
console.log('New refresh token:', result.refreshToken);
```

---

#### `signOut()`

Invalidate a specific session.

```typescript
async signOut(sessionToken: string): Promise<{
  success: boolean;
}>
```

**Parameters:**
- `sessionToken` (required) - Session token to invalidate

**Returns:**
- `{ success: true }` on successful logout

**Throws:**
- `"Session token is required"` - Missing token
- `"Session not found"` - Invalid session

---

#### `signOutAllDevices()`

Invalidate all sessions for a user (logout from all devices).

```typescript
async signOutAllDevices(userId: string): Promise<{
  success: boolean;
  sessionsDeleted: number;
}>
```

**Parameters:**
- `userId` (required) - User ID

**Returns:**
- `success` - Operation status
- `sessionsDeleted` - Number of sessions deleted

**Example:**
```typescript
const result = await auth.signOutAllDevices(user.id);

console.log(`Logged out from ${result.sessionsDeleted} devices`);
```

---

### OAuth Methods

#### `getAuthorizationUrl()`

Get OAuth authorization URL for a provider.

```typescript
async getAuthorizationUrl(providerId: string): Promise<{
  url: string;
  state: string;
}>
```

**Parameters:**
- `providerId` (required) - Provider ID ('google', 'github', etc.)

**Returns:**
- `url` - Authorization URL to redirect user to
- `state` - CSRF protection state (store in session/cookie)

**Throws:**
- `"Provider 'xyz' not found"` - Unknown provider
- `"Provider 'xyz' is not an OAuth provider"` - Wrong provider type

**Example:**
```typescript
const { url, state } = await auth.getAuthorizationUrl('google');

// Store state in session
req.session.oauthState = state;

// Redirect user to OAuth provider
res.redirect(url);
```

---

#### `handleOAuthCallback()`

Handle OAuth callback and authenticate user.

```typescript
async handleOAuthCallback(
  providerId: string,
  code: string,
  expectedState?: string,
  receivedState?: string
): Promise<{
  user: User;
  token: string;
  isNewUser: boolean;
}>
```

**Parameters:**
- `providerId` (required) - Provider ID
- `code` (required) - Authorization code from OAuth provider
- `expectedState` (optional) - Expected state value
- `receivedState` (optional) - Received state value from callback

**Returns:**
- `user` - Authenticated user
- `token` - JWT access token
- `isNewUser` - `true` if user was just created

**Throws:**
- `"Invalid state parameter - possible CSRF attack"` - State mismatch
- `"Provider 'xyz' not found"` - Unknown provider
- Various OAuth provider errors

**Example:**
```typescript
const result = await auth.handleOAuthCallback(
  'google',
  code,
  req.session.oauthState,
  req.query.state
);

if (result.isNewUser) {
  console.log('New user registered:', result.user.email);
} else {
  console.log('Existing user logged in:', result.user.email);
}
```

---

### Utility Methods

#### `generateJwt()`

Generate a JWT token with custom payload.

```typescript
generateJwt(payload: JWT): string
```

**Parameters:**
- `payload` - JWT payload object

**Returns:**
- JWT token string

---

#### `verifyJwt()`

Verify and decode a JWT token.

```typescript
async verifyJwt(token: string): Promise<JWT | null>
```

**Parameters:**
- `token` - JWT token string

**Returns:**
- Decoded JWT payload or `null` if invalid

---

#### `hashPassword()`

Hash a plain text password.

```typescript
async hashPassword(plainTextPassword: string): Promise<string>
```

**Parameters:**
- `plainTextPassword` - Password to hash

**Returns:**
- Bcrypt hash string

---

#### `comparePassword()`

Compare plain text password with hash.

```typescript
async comparePassword(
  plainTextPassword: string,
  hash: string
): Promise<boolean>
```

**Parameters:**
- `plainTextPassword` - Plain text password
- `hash` - Bcrypt hash to compare against

**Returns:**
- `true` if password matches, `false` otherwise

---

## Configuration

### NexusAuthConfig

```typescript
interface NexusAuthConfig {
  adapter: BaseAdapter;           // Database adapter (required)
  jwt?: {
    secret: string;               // JWT signing secret (required)
    expiresIn?: string | number;  // Token expiration (default: '7d')
    algorithm?: JWTAlgorithm;     // Signing algorithm (default: 'HS256')
    issuer?: string;              // JWT issuer claim
    audience?: string;            // JWT audience claim
  };
  session?: {
    strategy?: 'jwt' | 'database'; // Session strategy (default: 'jwt')
    maxAge?: number;               // Session max age in seconds (default: 2592000 = 30 days)
    updateAge?: number;            // Session update interval in seconds
    refreshToken?: {
      enabled?: boolean;           // Enable refresh tokens (default: false)
      maxAge?: number;             // Refresh token max age in seconds
    };
  };
  callbacks?: {
    jwt?: (params: {
      token: JWT;
      user?: User;
      account?: Account;
    }) => Promise<JWT>;
    session?: (params: {
      session: any;
      token: JWT;
    }) => Promise<any>;
  };
  events?: {
    signIn?: (params: {
      user: User;
      account?: Account;
    }) => Promise<void>;
    signOut?: () => Promise<void>;
    createUser?: (params: {
      user: User;
    }) => Promise<void>;
    linkAccount?: (params: {
      user: User;
      account: Account;
    }) => Promise<void>;
  };
}
```

### Example Configuration

```typescript
const auth = new NexusAuth({
  adapter: new PrismaAdapter({ prisma }),
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'myapp.com',
    audience: 'myapp-users'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,    // 24 hours
    refreshToken: {
      enabled: true,
      maxAge: 90 * 24 * 60 * 60 // 90 days
    }
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    }
  },
  events: {
    signIn: async ({ user }) => {
      console.log(`User signed in: ${user.email}`);
    },
    createUser: async ({ user }) => {
      // Send welcome email
      await sendWelcomeEmail(user.email);
    }
  }
});
```

---

## Types & Interfaces

### User

```typescript
interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
}
```

### Account

```typescript
interface Account {
  id: string;
  userId: string;
  type: string;                    // 'credentials' | 'oauth' | 'email'
  provider: string;                // 'credentials' | 'google' | 'github' etc.
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}
```

### Session

```typescript
interface Session {
  sessionToken: string;
  userId: string;
  expires: Date;
  refreshToken?: string | null;
  refreshTokenExpires?: Date | null;
}
```

### JWT

```typescript
interface JWT {
  sub?: string;        // User ID
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;  // Custom claims
}
```

---

## Database Adapters

All adapters implement the `BaseAdapter` interface:

```typescript
interface BaseAdapter {
  // User methods
  createUser(user: Omit<User, 'id'>): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByResetToken(resetToken: string): Promise<User | null>;
  getUserByVerificationToken(token: string): Promise<User | null>;
  updateUser(user: Partial<User> & { id: string }): Promise<User>;
  deleteUser(userId: string): Promise<User | null>;

  // Account methods
  linkAccount(account: Account): Promise<Account>;
  getUserByAccount(data: {
    provider: string;
    providerAccountId: string;
  }): Promise<User | null>;
  getAccountByProvider(data: {
    userId: string;
    provider: string;
  }): Promise<Account | null>;
  updateAccount(account: Partial<Account> & { id: string }): Promise<Account>;
  unlinkAccount(data: {
    provider: string;
    providerAccountId: string;
  }): Promise<Account | null>;

  // Session methods
  createSession(session: {
    sessionToken: string;
    userId: string;
    expires: Date;
    refreshToken?: string;
    refreshTokenExpires?: Date;
  }): Promise<Session>;
  getSessionAndUser(sessionToken: string): Promise<{
    session: Session;
    user: User;
  } | null>;
  getSessionByRefreshToken(refreshToken: string): Promise<Session | null>;
  updateSession(session: Partial<Session> & {
    sessionToken: string;
  }): Promise<Session | null>;
  deleteSession(sessionToken: string): Promise<Session | null>;
  deleteUserSessions(userId: string): Promise<number>;
}
```

### Adapter-Specific Documentation

- [TypeORM Adapter API](./typeorm-adapter-api.md)
- [Prisma Adapter API](./prisma-adapter-api.md)
- [Mongoose Adapter API](./mongoose-adapter-api.md)
- [SQL Adapter API](./sql-adapter-api.md)

---

## OAuth Providers

### Provider Interface

```typescript
interface OAuth2Provider {
  id: string;
  name: string;
  type: 'oauth';

  getAuthorizationUrl(params: {
    state: string;
  }): Promise<string>;

  getUserProfile(code: string): Promise<{
    id: string;
    email: string;
    name?: string;
    image?: string;
  }>;
}
```

### Available Providers

- [Google Provider API](./oauth-google.md)
- [GitHub Provider API](./oauth-github.md)
- [Facebook Provider API](./oauth-facebook.md)
- [Microsoft Provider API](./oauth-microsoft.md)

---

## Framework Helpers

### Express Helpers

```typescript
import {
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  getCurrentUser,
  getCurrentSession,
  signOut
} from '@nexusauth/express-helpers';
```

- [Express Helpers API](./express-helpers-api.md)

### Next.js Helpers

```typescript
import {
  getSession,
  getCurrentUser,
  requireAuth,
  createAuthMiddleware,
  getSessionFromMiddleware
} from '@nexusauth/nextjs-helpers';
```

- [Next.js Helpers API](./nextjs-helpers-api.md)

### NestJS Helpers

```typescript
import {
  NexusAuthModule,
  NexusAuthService,
  NexusAuthGuard,
  Public,
  CurrentUser,
  CurrentSession,
  CurrentUserId
} from '@nexusauth/nestjs-helpers';
```

- [NestJS Helpers API](./nestjs-helpers-api.md)

---

## Error Handling

All methods throw standard JavaScript `Error` objects. Catch and handle them appropriately:

```typescript
try {
  await auth.signIn({ email, password });
} catch (error) {
  if (error.message === 'Invalid email or password') {
    // Handle invalid credentials
  } else {
    // Handle other errors
  }
}
```

---

## Next Steps

- [Getting Started Guides](./README.md)
- [Migration Guides](./migration-from-authjs.md)
- [Best Practices](./security-best-practices.md)
- [Examples](/examples)
