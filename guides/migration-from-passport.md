# Migration Guide: Passport.js to NexusAuth

This guide will help you migrate from Passport.js to NexusAuth.

## Why Migrate to NexusAuth?

- **Full-Stack Solution**: Unlike Passport, includes database adapters and session management
- **Modern Architecture**: TypeScript-first with hexagonal architecture
- **Schema Mapping**: Integrate with existing databases without schema changes
- **Built-in Features**: Password reset, email verification, refresh tokens out of the box
- **Framework Agnostic**: Works with Express, Next.js, NestJS, and more
- **Simpler Configuration**: Less boilerplate than Passport

## Key Differences

| Feature | Passport.js | NexusAuth |
|---------|-------------|-----------|
| Database Integration | ❌ Manual | ✅ Built-in adapters |
| Session Management | ❌ Manual | ✅ Built-in |
| Schema Mapping | ❌ No | ✅ Yes |
| Password Reset | ❌ Manual | ✅ Built-in |
| Email Verification | ❌ Manual | ✅ Built-in |
| TypeScript | Partial | ✅ Full support |
| Strategies | 500+ | Growing (high quality) |

---

## Step-by-Step Migration (Express)

### Step 1: Install NexusAuth

**Remove Passport:**
```bash
npm uninstall passport passport-local passport-google-oauth20 express-session
```

**Install NexusAuth:**
```bash
npm install @nexusauth/core @nexusauth/express-helpers
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt

# Install database adapter
npm install @nexusauth/typeorm-adapter typeorm pg
# OR
npm install @nexusauth/prisma-adapter @prisma/client
```

---

### Step 2: Replace Passport Configuration

**Passport.js Setup:**
```typescript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import session from 'express-session';

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { googleId: profile.id } });

      if (!user) {
        user = await User.create({
          email: profile.emails[0].value,
          name: profile.displayName,
          googleId: profile.id,
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
```

**NexusAuth Setup:**
```typescript
import { NexusAuth } from '@nexusauth/core';
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { createAuthMiddleware } from '@nexusauth/express-helpers';
import { DataSource } from 'typeorm';

// Database setup
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  synchronize: true,
  entities: [],
});

await dataSource.initialize();

// Auth setup
const auth = new NexusAuth({
  adapter: new TypeORMAdapter({ dataSource }),
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d',
  },
  session: {
    strategy: 'jwt',
  },
});

// Google OAuth provider
const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/google/callback',
});

// Add middleware (optional - for automatic session extraction)
app.use(createAuthMiddleware(auth));
```

---

### Step 3: Update Routes

**Passport.js Routes:**
```typescript
// Login
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

// Register
app.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ user });
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Google OAuth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
  })
);

// Logout
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
```

**NexusAuth Routes:**
```typescript
import { requireAuth } from '@nexusauth/express-helpers';

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await auth.signIn({ email, password });

    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const result = await auth.register({ email, password, name });

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      verificationToken: result.verificationToken, // Send via email
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Google OAuth
app.get('/auth/google', async (req, res) => {
  const { url, state } = await auth.getAuthorizationUrl(googleProvider.id);

  // Store state in session or cookie for CSRF protection
  req.session.oauthState = state;

  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    const result = await auth.handleOAuthCallback(
      googleProvider.id,
      code as string,
      req.session.oauthState,
      state as string
    );

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      isNewUser: result.isNewUser,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Logout
app.post('/logout', requireAuth, async (req, res) => {
  try {
    await auth.signOut(req.session!.sessionToken);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});
```

---

### Step 4: Update Protected Routes

**Passport.js:**
```typescript
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/profile', ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

**NexusAuth:**
```typescript
import { requireAuth } from '@nexusauth/express-helpers';

app.get('/profile', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    session: req.session,
  });
});
```

---

### Step 5: Database Schema

**Passport.js (Manual):**
```typescript
// You had to create your own user model
interface User {
  id: string;
  email: string;
  password: string;
  googleId?: string;
  // ... other fields
}
```

**NexusAuth (Automatic with TypeORM):**
```typescript
// TypeORM adapter creates these automatically
// Or you can use existing tables with schema mapping:

const adapter = new TypeORMAdapter({
  dataSource,
  mapping: {
    user: {
      tableName: 'users',
      columns: {
        id: 'user_id',
        email: 'email_address',
        emailVerified: 'email_verified_at',
      },
    },
  },
});
```

---

### Step 6: Session Management

**Passport.js (Cookie-based sessions):**
```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));
```

**NexusAuth (JWT-based, stateless):**
```typescript
// No session middleware needed!
// JWT is extracted from Authorization header automatically

// Or store in cookies:
app.post('/login', async (req, res) => {
  const result = await auth.signIn(req.body);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ user: result.user });
});
```

---

## Additional Features (Not in Passport)

### Password Reset Flow

**NexusAuth has built-in support:**
```typescript
// Request reset
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await auth.requestPasswordReset(email);

    // Send email with result.resetToken
    await sendPasswordResetEmail(email, result.resetToken);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reset password
app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const result = await auth.resetPassword(token, newPassword);

    res.json({
      success: true,
      token: result.token, // Auto-login
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

### Email Verification

```typescript
// Send verification email
app.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await auth.sendVerificationEmail(email);

    // Send email with result.verificationToken
    await sendVerificationEmail(email, result.verificationToken);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Verify email
app.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await auth.verifyEmail(token);

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

### Refresh Tokens

```typescript
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await auth.refreshAccessToken(refreshToken);

    res.json({
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});
```

---

## Migration for Other Frameworks

### NestJS Migration

See [NestJS Migration Guide](./migration-passport-nestjs.md)

### Next.js Migration

See [Next.js Migration Guide](./migration-passport-nextjs.md)

---

## Environment Variables

**Passport.js:**
```env
SESSION_SECRET=your-session-secret
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

**NexusAuth:**
```env
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
DATABASE_URL=postgresql://...
```

---

## Feature Comparison

### What Passport Has
- ✅ 500+ strategies
- ✅ Mature ecosystem
- ✅ Flexible architecture

### What NexusAuth Has
- ✅ **Database adapters** (Passport doesn't have this!)
- ✅ **Schema mapping**
- ✅ **Built-in password reset**
- ✅ **Built-in email verification**
- ✅ **JWT sessions** (stateless)
- ✅ **Refresh tokens**
- ✅ **TypeScript first**
- ✅ **Modern architecture**

---

## Migration Checklist

- [ ] Install NexusAuth packages
- [ ] Remove Passport dependencies
- [ ] Set up database adapter
- [ ] Configure NexusAuth instance
- [ ] Migrate login route
- [ ] Migrate registration route
- [ ] Migrate OAuth routes
- [ ] Update protected route middleware
- [ ] Test authentication flows
- [ ] Add password reset (bonus!)
- [ ] Add email verification (bonus!)

---

## Common Migration Patterns

### From `req.isAuthenticated()` to NexusAuth

**Before:**
```typescript
if (req.isAuthenticated()) {
  // User is logged in
}
```

**After:**
```typescript
import { getCurrentUser } from '@nexusauth/express-helpers';

const user = await getCurrentUser(auth, req);
if (user) {
  // User is logged in
}

// Or use middleware:
app.get('/route', requireAuth, (req, res) => {
  // req.user is available here
});
```

### From `req.login()` to NexusAuth

**Before:**
```typescript
req.login(user, (err) => {
  if (err) return next(err);
  res.json({ user });
});
```

**After:**
```typescript
const result = await auth.signIn({ email, password });
res.json({
  user: result.user,
  token: result.token,
});
```

### From `req.logout()` to NexusAuth

**Before:**
```typescript
req.logout((err) => {
  if (err) return next(err);
  res.json({ success: true });
});
```

**After:**
```typescript
await auth.signOut(req.session!.sessionToken);
res.json({ success: true });
```

---

## Troubleshooting

### "Session undefined" errors
Make sure you're using the auth middleware or manually extracting the JWT token.

### "User not found after OAuth"
Check that your OAuth callback is properly handling user creation and account linking.

### "Cannot access req.user"
Use `requireAuth` middleware or manually extract user with `getCurrentUser()`.

---

## Next Steps

- [Express Getting Started](./getting-started-express.md)
- [API Reference](./api-reference.md)
- [OAuth Providers](./oauth-providers.md)
- [Schema Mapping Guide](./schema-mapping.md)

---

## Need Help?

- [GitHub Issues](https://github.com/yourusername/nexus-auth/issues)
- [Discussions](https://github.com/yourusername/nexus-auth/discussions)
- [Documentation](../DOCUMENTATION.md)
