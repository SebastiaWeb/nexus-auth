# NexusAuth Best Practices

A comprehensive guide to implementing secure and performant authentication with NexusAuth.

## Table of Contents

- [Security Best Practices](#security-best-practices)
- [Password Management](#password-management)
- [JWT & Session Security](#jwt--session-security)
- [OAuth Security](#oauth-security)
- [Database Security](#database-security)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Production Deployment](#production-deployment)

---

## Security Best Practices

### 1. Environment Variables

**✅ DO:**
```typescript
// Use environment variables for secrets
const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d'
  }
});
```

**❌ DON'T:**
```typescript
// Never hardcode secrets
const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: 'my-secret-key-123', // NEVER DO THIS!
    expiresIn: '7d'
  }
});
```

**Environment Variables Checklist:**
- [ ] Use `.env` files (add to `.gitignore`)
- [ ] Different secrets for dev/staging/production
- [ ] Rotate secrets regularly in production
- [ ] Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

---

### 2. JWT Secret Generation

**Generate strong secrets:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Result example:
# JWT_SECRET=XyZ9k2L8mN4pQ7rS1tU6vW3xA5bC0dE8fG1hI4jK7lM
```

**Secret Requirements:**
- Minimum 32 characters
- Random, not predictable
- Different for each environment
- Never commit to version control

---

### 3. HTTPS in Production

**✅ Always use HTTPS in production:**
```typescript
// Next.js
export async function GET(request: NextRequest) {
  const result = await auth.signIn({ email, password });

  const response = NextResponse.json(result);

  response.cookies.set('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
```

**Cookie Security Flags:**
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - HTTPS only (production)
- `sameSite: 'lax'` or `'strict'` - CSRF protection

---

### 4. CORS Configuration

**✅ Restrict CORS origins:**
```typescript
// Express
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies
}));
```

**❌ Don't allow all origins:**
```typescript
// NEVER DO THIS in production
app.use(cors({
  origin: '*', // Dangerous!
  credentials: true
}));
```

---

## Password Management

### 1. Password Strength Requirements

**Implement password validation:**
```typescript
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Use in registration
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  const validation = validatePassword(password);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  const result = await auth.register({ email, password, name });
  res.json({ success: true, ...result });
});
```

---

### 2. Password Reset Security

**✅ Best practices for password reset:**

```typescript
// 1. Generate secure token with expiration
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await auth.requestPasswordReset(email);

    // 2. Send email with time-limited link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${result.resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    // 3. Don't reveal if email exists
    res.json({
      success: true,
      message: 'If an account exists, a reset email will be sent'
    });
  } catch (error) {
    // Don't expose errors
    res.json({
      success: true,
      message: 'If an account exists, a reset email will be sent'
    });
  }
});

// 4. Invalidate old sessions after password reset
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await auth.resetPassword(token, newPassword);

  // Logout from all devices for security
  await auth.signOutAllDevices(result.user.id);

  res.json({
    success: true,
    token: result.token // New token for current session
  });
});
```

---

### 3. Rate Limiting

**Prevent brute force attacks:**
```typescript
import rateLimit from 'express-rate-limit';

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, async (req, res) => {
  // Login logic
});

// Password reset rate limiting
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: 'Too many password reset requests',
});

app.post('/forgot-password', resetLimiter, async (req, res) => {
  // Reset logic
});
```

---

## JWT & Session Security

### 1. Token Expiration

**✅ Use appropriate expiration times:**
```typescript
const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d', // Access token: 7 days (adjust based on security needs)
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Refresh session daily
    refreshToken: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60, // Refresh token: 30 days
    }
  }
});
```

**Token Expiration Guidelines:**
- **Access tokens**: 15 minutes to 7 days
- **Refresh tokens**: 30 to 90 days
- **Reset tokens**: 1 hour
- **Verification tokens**: 24 hours

---

### 2. Refresh Token Rotation

**✅ Implement refresh token rotation:**
```typescript
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // This automatically rotates the refresh token
    const result = await auth.refreshAccessToken(refreshToken);

    res.json({
      token: result.token,
      refreshToken: result.refreshToken, // New refresh token
    });
  } catch (error: any) {
    res.status(401).json({
      error: 'Invalid or expired refresh token'
    });
  }
});
```

**Benefits:**
- Limits the window of attack if token is stolen
- Automatically invalidates old refresh tokens
- Detects token replay attacks

---

### 3. Token Storage

**Client-side token storage:**

**✅ Best: httpOnly cookies (server-side)**
```typescript
// Set token in httpOnly cookie
response.cookies.set('token', result.token, {
  httpOnly: true, // Not accessible via JavaScript
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7
});
```

**⚠️ OK: localStorage (if you need client access)**
```typescript
// Client-side (only if necessary)
localStorage.setItem('token', result.token);

// Always send via Authorization header
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

**❌ Never: Plain cookies without httpOnly**
```typescript
// DON'T DO THIS - vulnerable to XSS
document.cookie = `token=${result.token}`;
```

---

### 4. JWT Claims Validation

**Add custom claims for additional security:**
```typescript
const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: process.env.JWT_SECRET!,
    issuer: 'myapp.com', // Who issued the token
    audience: 'myapp-users', // Who can use it
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.issuedAt = Date.now();
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Validate custom claims
      if (token.issuedAt && Date.now() - token.issuedAt > 7 * 24 * 60 * 60 * 1000) {
        throw new Error('Token too old, please re-authenticate');
      }

      session.user.id = token.userId;
      session.user.role = token.role;
      return session;
    }
  }
});
```

---

## OAuth Security

### 1. State Parameter (CSRF Protection)

**✅ Always validate state parameter:**
```typescript
// Generate and store state
app.get('/auth/google', async (req, res) => {
  const { url, state } = await auth.getAuthorizationUrl('google');

  // Store state in session
  req.session.oauthState = state;

  res.redirect(url);
});

// Validate state in callback
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state
  if (state !== req.session.oauthState) {
    return res.status(400).json({
      error: 'Invalid state parameter - possible CSRF attack'
    });
  }

  const result = await auth.handleOAuthCallback(
    'google',
    code as string,
    req.session.oauthState,
    state as string
  );

  // Clear state after use
  delete req.session.oauthState;

  res.json(result);
});
```

---

### 2. Redirect URI Validation

**✅ Whitelist allowed redirect URIs:**
```typescript
const allowedRedirects = [
  'http://localhost:3000',
  'https://myapp.com',
  'https://app.myapp.com'
];

app.get('/auth/google/callback', async (req, res) => {
  const { code, redirect_uri } = req.query;

  // Validate redirect URI
  if (redirect_uri && !allowedRedirects.includes(redirect_uri as string)) {
    return res.status(400).json({
      error: 'Invalid redirect URI'
    });
  }

  // Process OAuth callback
  const result = await auth.handleOAuthCallback('google', code as string);

  res.redirect(redirect_uri as string || '/dashboard');
});
```

---

### 3. OAuth Provider Configuration

**✅ Use environment-specific OAuth apps:**
```typescript
// Development
const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID_DEV!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET_DEV!,
  redirectUri: 'http://localhost:3000/auth/google/callback'
});

// Production
const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID_PROD!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET_PROD!,
  redirectUri: 'https://myapp.com/auth/google/callback'
});
```

---

## Database Security

### 1. Connection Security

**✅ Use SSL for database connections:**
```typescript
// TypeORM with SSL
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false,
  entities: [],
  synchronize: false, // Never true in production!
});

// Prisma with SSL
// In .env:
// DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

---

### 2. Schema Synchronization

**❌ NEVER in production:**
```typescript
// TypeORM
const dataSource = new DataSource({
  // ...config
  synchronize: process.env.NODE_ENV !== 'production', // Only in dev
});
```

**✅ Use migrations:**
```bash
# TypeORM
npm run typeorm migration:generate -- -n AddUserTable
npm run typeorm migration:run

# Prisma
npx prisma migrate dev --name add_user_table
npx prisma migrate deploy # Production
```

---

### 3. Index Critical Fields

**Optimize authentication queries:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique // Already indexed
  resetToken    String?   @unique // Index for fast lookups
  verificationToken String? @unique

  @@index([email]) // Explicit index
  @@index([resetToken])
  @@map("users")
}
```

---

## Performance Optimization

### 1. Database Connection Pooling

**✅ Configure connection pools:**
```typescript
// TypeORM
const dataSource = new DataSource({
  type: 'postgres',
  // ...config
  poolSize: 10, // Max connections
  extra: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  }
});

// Prisma (automatic pooling)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
```

---

### 2. Caching Strategy

**Cache user sessions:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache session
app.get('/api/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  // Check cache first
  const cached = await redis.get(`session:${token}`);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Get from database
  const session = await auth.getSession(token);

  // Cache for 5 minutes
  await redis.setex(
    `session:${token}`,
    300,
    JSON.stringify(session)
  );

  res.json(session);
});
```

---

### 3. Lazy Loading

**Load user data only when needed:**
```typescript
// ✅ Good: Load only when needed
app.get('/api/profile', requireAuth, async (req, res) => {
  // req.user already has basic info from JWT
  res.json({ user: req.user });
});

// Load additional data only if needed
app.get('/api/profile/detailed', requireAuth, async (req, res) => {
  const fullUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      profile: true,
      settings: true,
    }
  });

  res.json({ user: fullUser });
});
```

---

## Error Handling

### 1. Don't Expose Sensitive Information

**✅ Generic error messages:**
```typescript
app.post('/login', async (req, res) => {
  try {
    const result = await auth.signIn(req.body);
    res.json(result);
  } catch (error: any) {
    // Don't expose specific errors
    res.status(401).json({
      error: 'Invalid credentials' // Generic message
    });

    // Log detailed error server-side
    console.error('[Login Error]', error.message);
  }
});
```

**❌ Don't do this:**
```typescript
// Reveals if email exists
if (error.message === 'User not found') {
  res.status(404).json({ error: 'User not found' });
}
```

---

### 2. Centralized Error Handler

**Create a global error handler:**
```typescript
// middleware/errorHandler.ts
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error]', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed' });
  }

  // Generic error
  res.status(500).json({
    error: 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message
    })
  });
}

// Use in Express
app.use(errorHandler);
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

**Security:**
- [ ] All secrets in environment variables
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Database SSL enabled
- [ ] `synchronize: false` in TypeORM

**Performance:**
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] Database indexes created
- [ ] Migrations up to date

**Monitoring:**
- [ ] Error logging (Sentry, LogRocket)
- [ ] Performance monitoring (New Relic, DataDog)
- [ ] Auth event tracking
- [ ] Failed login attempts tracking

---

### 2. Health Checks

**Implement health check endpoint:**
```typescript
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        auth: 'up'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});
```

---

### 3. Monitoring & Logging

**Log important auth events:**
```typescript
const auth = new NexusAuth({
  adapter,
  // ...config
  events: {
    signIn: async ({ user }) => {
      console.log('[Auth] User signed in:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
    },
    createUser: async ({ user }) => {
      console.log('[Auth] New user created:', {
        userId: user.id,
        email: user.email
      });
    },
    signOut: async () => {
      console.log('[Auth] User signed out');
    }
  }
});
```

---

## Quick Reference

### Security Checklist
- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS in production
- [ ] httpOnly cookies
- [ ] CORS whitelist
- [ ] Rate limiting
- [ ] Password strength requirements
- [ ] State parameter validation (OAuth)
- [ ] Generic error messages

### Performance Checklist
- [ ] Connection pooling
- [ ] Database indexes
- [ ] Caching strategy
- [ ] Lazy loading
- [ ] Migrations (no sync in prod)

### Production Checklist
- [ ] Environment variables
- [ ] SSL/TLS enabled
- [ ] Error monitoring
- [ ] Health checks
- [ ] Audit logging
- [ ] Backup strategy

---

## Next Steps

- [API Reference](./api-reference.md)
- [Security Guide](./security-guide.md)
- [Performance Guide](./performance.md)
- [Deployment Guide](./deployment.md)
