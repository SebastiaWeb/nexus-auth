# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:

**security@nexus-auth.dev** (or your security contact email)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt of your vulnerability report within 48 hours
- **Communication**: We'll keep you informed about our progress
- **Timeline**: We aim to release a fix within 7-14 days for critical issues
- **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using NexusAuth in production:

### 1. Environment Variables

Never commit sensitive credentials to version control:

```typescript
// ❌ Bad
const auth = new NexusAuth({
  secret: 'my-secret-key',
  oauth: {
    google: {
      clientId: 'hardcoded-id',
      clientSecret: 'hardcoded-secret'
    }
  }
});

// ✅ Good
const auth = new NexusAuth({
  secret: process.env.AUTH_SECRET,
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
});
```

### 2. Strong Secrets

Use strong, random secrets for JWT signing:

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. HTTPS Only

Always use HTTPS in production:

```typescript
const auth = new NexusAuth({
  cookies: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict'
  }
});
```

### 4. Rate Limiting

Implement rate limiting for authentication endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/auth/login', loginLimiter, authHandler);
```

### 5. Password Policies

Enforce strong password policies:

```typescript
const auth = new NexusAuth({
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
});
```

### 6. Token Expiration

Use appropriate token expiration times:

```typescript
const auth = new NexusAuth({
  jwt: {
    accessTokenExpiry: '15m',  // Short-lived access tokens
    refreshTokenExpiry: '7d'    // Longer-lived refresh tokens
  }
});
```

### 7. Database Security

Ensure your database connection is secure:

```typescript
// Use SSL for database connections in production
const auth = new NexusAuth({
  adapter: new PrismaAdapter({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
      }
    }
  })
});
```

## Security Headers

Implement security headers in your application:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## OAuth Security

When using OAuth providers:

### 1. Validate Redirect URIs

Always validate OAuth redirect URIs:

```typescript
const auth = new NexusAuth({
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: 'https://yourdomain.com/auth/callback/google' // Exact match
    }
  }
});
```

### 2. Use State Parameter

NexusAuth automatically handles CSRF protection via the state parameter, but ensure you don't disable it:

```typescript
// State parameter is enabled by default
const auth = new NexusAuth({
  oauth: {
    providers: [...],
    useStateParameter: true // Default, don't disable
  }
});
```

### 3. Scope Minimization

Only request the OAuth scopes you actually need:

```typescript
const auth = new NexusAuth({
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: ['email', 'profile'] // Minimal scopes
    }
  }
});
```

## Regular Updates

Keep NexusAuth and its dependencies up to date:

```bash
# Check for updates
pnpm outdated

# Update packages
pnpm update

# For security updates specifically
pnpm audit
pnpm audit fix
```

## Security Advisories

Security advisories will be published on:

- [GitHub Security Advisories](https://github.com/yourusername/nexus-auth/security/advisories)
- npm advisory database
- Release notes

Subscribe to releases to stay informed about security updates.

## Bug Bounty Program

We currently do not have a bug bounty program. However, we greatly appreciate responsible disclosure and will credit researchers in our security advisories.

## Questions?

If you have questions about security that aren't related to vulnerabilities, please:

- Check our [security documentation](./docs/security.md)
- Ask in [GitHub Discussions](https://github.com/yourusername/nexus-auth/discussions)
- Email us at security@nexus-auth.dev

## Attribution

We'd like to thank the following security researchers for responsibly disclosing vulnerabilities:

<!-- Security researchers will be listed here -->

---

Thank you for helping keep NexusAuth and its users safe! 🔒
