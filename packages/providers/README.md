# @nexus-auth/providers

OAuth provider factories for NexusAuth.

## Installation

```bash
# Using pnpm
pnpm add @nexus-auth/providers @nexus-auth/core

# Using npm
npm install @nexus-auth/providers @nexus-auth/core
```

## Usage

```typescript
import { NexusAuth } from '@nexus-auth/core';
import { GoogleProvider, GitHubProvider, FacebookProvider } from '@nexus-auth/providers';

const auth = new NexusAuth({
  adapter: yourAdapter,
  secret: process.env.SECRET!,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID!,
      clientSecret: process.env.FACEBOOK_SECRET!,
    }),
  ],
});
```

## Available Providers

### GoogleProvider

```typescript
GoogleProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Optional, defaults to http://localhost:3000/api/auth/callback/google
})
```

### GitHubProvider

```typescript
GitHubProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Optional, defaults to http://localhost:3000/api/auth/callback/github
})
```

### FacebookProvider

```typescript
FacebookProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Optional, defaults to http://localhost:3000/api/auth/callback/facebook
})
```

## OAuth Flow

### 1. Redirect to Provider

```typescript
// Get authorization URL
const { url, state } = await auth.getAuthorizationUrl('google');

// Store state in session for CSRF protection
req.session.oauthState = state;

// Redirect user to OAuth provider
res.redirect(url);
```

### 2. Handle Callback

```typescript
// In your callback route (e.g., /api/auth/callback/google)
const { code, state } = req.query;

// Validate state from session
const expectedState = req.session.oauthState;

// Handle OAuth callback
const { user, token, isNewUser } = await auth.handleOAuthCallback(
  'google',
  code,
  expectedState,
  state
);

// User is now authenticated
console.log(user); // User object
console.log(token); // JWT token
console.log(isNewUser); // true if user was just created
```

## Creating Custom Providers

You can create custom OAuth providers using the `OAuth2Provider` class from `@nexus-auth/core`:

```typescript
import { OAuth2Provider } from '@nexus-auth/core';

function MyCustomProvider(config: { clientId: string; clientSecret: string }) {
  return new OAuth2Provider(
    'mycustom', // Provider ID
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: 'https://provider.com/oauth/authorize',
      tokenUrl: 'https://provider.com/oauth/token',
      userInfoUrl: 'https://provider.com/api/user',
      scope: 'email profile',
      profile: (profile) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: profile.avatar,
      }),
    }
  );
}
```

## Features

- ✅ **Zero dependencies** - Uses native fetch (Node.js 18+)
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Simple API** - NextAuth.js-style provider factories
- ✅ **Extensible** - Create custom providers easily
- ✅ **Secure** - Built-in CSRF protection with state parameter

## License

MIT
